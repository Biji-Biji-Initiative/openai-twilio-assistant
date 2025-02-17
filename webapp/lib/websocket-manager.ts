import { logger } from './logger';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface WebSocketManagerConfig {
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  maxRetryAttempts?: number;
  heartbeatInterval?: number;
  reconnectOnClose?: boolean;
}

type MessageHandler = (message: WebSocketMessage) => void;

class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private reconnectAttempt = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isReconnecting = false;
  private lastPongTime: number = Date.now();
  private missedPongs = 0;

  private config: Required<WebSocketManagerConfig> = {
    initialRetryDelay: 1000,
    maxRetryDelay: 30000,
    maxRetryAttempts: 5,
    heartbeatInterval: 30000,
    reconnectOnClose: true
  };

  private constructor() {
    // Initialize heartbeat check
    setInterval(() => this.checkHeartbeat(), 10000);
  }

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  configure(config: WebSocketManagerConfig) {
    this.config = { ...this.config, ...config };
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isReconnecting) {
      logger.info("[WebSocketManager] Already connected or reconnecting");
      return;
    }

    try {
      const wsUrl = new URL("/logs", process.env.NEXT_PUBLIC_BACKEND_URL || "");
      wsUrl.protocol = wsUrl.protocol.replace("http", "ws");
      
      logger.info("[WebSocketManager] Connecting to:", wsUrl.toString());
      this.ws = new WebSocket(wsUrl.toString());

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      logger.error("[WebSocketManager] Connection error:", error);
      this.scheduleReconnect();
    }
  }

  private handleOpen() {
    logger.info("[WebSocketManager] Connected");
    this.isReconnecting = false;
    this.reconnectAttempt = 0;
    this.missedPongs = 0;
    this.lastPongTime = Date.now();
    this.setupHeartbeat();
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      
      // Handle pong messages
      if (data.type === "pong") {
        this.lastPongTime = Date.now();
        this.missedPongs = 0;
        return;
      }

      // Distribute message to all handlers
      this.messageHandlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          logger.error("[WebSocketManager] Handler error:", error);
        }
      });
    } catch (error) {
      logger.error("[WebSocketManager] Message parsing error:", error);
    }
  }

  private handleClose(event: CloseEvent) {
    logger.info("[WebSocketManager] Connection closed:", event.code, event.reason);
    this.cleanup();
    
    if (this.config.reconnectOnClose && (event.code !== 1000 || event.reason !== "Closed by client")) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event) {
    logger.error("[WebSocketManager] WebSocket error:", event);
    this.cleanup();
    this.scheduleReconnect();
  }

  private setupHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, this.config.heartbeatInterval);
  }

  private checkHeartbeat() {
    const now = Date.now();
    if (this.ws?.readyState === WebSocket.OPEN && now - this.lastPongTime > this.config.heartbeatInterval * 2) {
      this.missedPongs++;
      logger.warn(`[WebSocketManager] Missed ${this.missedPongs} pongs`);

      if (this.missedPongs >= 3) {
        logger.error("[WebSocketManager] Connection seems dead, reconnecting...");
        this.ws.close(4000, "No heartbeat");
        this.cleanup();
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempt >= this.config.maxRetryAttempts) {
      logger.error("[WebSocketManager] Max reconnection attempts reached");
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.isReconnecting = true;
    const delay = Math.min(
      this.config.initialRetryDelay * Math.pow(2, this.reconnectAttempt),
      this.config.maxRetryDelay
    );

    logger.info(`[WebSocketManager] Reconnecting in ${delay}ms (Attempt ${this.reconnectAttempt + 1}/${this.config.maxRetryAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempt++;
      this.connect();
    }, delay);
  }

  private cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.ws) {
      // Remove all event listeners
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      
      // Only close if not already closed
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  subscribe(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  send(message: WebSocketMessage): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    logger.warn("[WebSocketManager] Cannot send message - connection not open");
    return false;
  }

  disconnect() {
    this.config.reconnectOnClose = false;
    if (this.ws) {
      this.ws.close(1000, "Closed by client");
    }
    this.cleanup();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.isReconnecting = false;
    this.reconnectAttempt = 0;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get connectionState() {
    return {
      isConnected: this.isConnected,
      isReconnecting: this.isReconnecting,
      reconnectAttempt: this.reconnectAttempt,
    };
  }
}

export const wsManager = WebSocketManager.getInstance(); 