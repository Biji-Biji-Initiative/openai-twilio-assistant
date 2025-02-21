import WebSocket from 'ws';
import { logger } from './logger';
import { CONFIG } from './config';
import { processWebSocketMessage } from './message-handler';

/**
 * WebSocket connection states
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected'
}

/**
 * WebSocket connection manager
 */
export class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageQueue: string[] = [];
  private readonly maxQueueSize = 1000;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance of WebSocketManager
   */
  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Get current connection state
   */
  public getState(): ConnectionState {
    return this.state;
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupEventHandlers(ws: WebSocket): void {
    ws.on('message', (data) => {
      try {
        const message = data.toString();
        
        // Add to message queue for replay if needed
        if (this.messageQueue.length < this.maxQueueSize) {
          this.messageQueue.push(message);
        }
        
        // Process the message
        processWebSocketMessage(message);
      } catch (error) {
        logger.error('Failed to handle WebSocket message', error as Error);
      }
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error', error as Error);
    });

    ws.on('close', (code, reason) => {
      logger.warning(`WebSocket closed: ${code} - ${reason}`);
      this.state = ConnectionState.DISCONNECTED;
    });
  }

  /**
   * Connect to WebSocket server with retry mechanism
   */
  public async connect(endpoint: string): Promise<void> {
    if (this.state === ConnectionState.CONNECTING || this.state === ConnectionState.CONNECTED) {
      logger.warning('WebSocket connection already exists');
      return;
    }

    this.state = ConnectionState.CONNECTING;
    let retries = CONFIG.maxRetries.websocket;

    const tryConnect = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        logger.info(`Connecting to WebSocket (attempt ${CONFIG.maxRetries.websocket - retries + 1}/${CONFIG.maxRetries.websocket})...`);

        // Clear any existing connection
        if (this.ws) {
          this.ws.terminate();
          this.ws = null;
        }

        // Create new connection
        this.ws = new WebSocket(endpoint);

        // Set connection timeout
        const timeout = setTimeout(() => {
          if (this.state !== ConnectionState.CONNECTED) {
            this.ws?.terminate();
            reject(new Error('WebSocket connection timeout'));
          }
        }, CONFIG.timeouts.websocketConnection);

        // Set up event handlers
        this.ws.once('open', () => {
          clearTimeout(timeout);
          this.state = ConnectionState.CONNECTED;
          this.setupEventHandlers(this.ws!);
          logger.success('WebSocket connected successfully');
          resolve();
        });

        this.ws.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    };

    while (retries > 0) {
      try {
        await tryConnect();
        return;
      } catch (error) {
        retries--;
        if (retries === 0) {
          this.state = ConnectionState.DISCONNECTED;
          throw new Error('Failed to establish WebSocket connection after all retries');
        }
        logger.warning(`Retrying connection in ${CONFIG.timeouts.retryInterval}ms...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.timeouts.retryInterval));
      }
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      try {
        this.ws.terminate();
      } catch (error) {
        logger.error('Error during WebSocket termination', error as Error);
      } finally {
        this.ws = null;
        this.state = ConnectionState.DISCONNECTED;
        logger.info('WebSocket disconnected');
      }
    }

    // Clear message queue
    this.messageQueue = [];
  }

  /**
   * Send message through WebSocket
   */
  public send(data: string | Buffer): void {
    if (this.state !== ConnectionState.CONNECTED || !this.ws) {
      throw new Error('Cannot send message: WebSocket not connected');
    }

    try {
      this.ws.send(data);
    } catch (error) {
      logger.error('Failed to send WebSocket message', error as Error);
      throw error;
    }
  }

  /**
   * Get recent messages from the queue
   */
  public getRecentMessages(): string[] {
    return [...this.messageQueue];
  }
}

// Export singleton instance
export const websocketManager = WebSocketManager.getInstance();
