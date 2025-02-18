import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { loggers } from './logger';

export interface WebSocketManagerOptions {
  url: string;
  pingInterval?: number;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  debug?: boolean;
}

export interface ConnectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  lastPing?: Date;
  lastPong?: Date;
}

export class WebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isCleaningUp = false;
  private readonly sessionId: string;
  private readonly options: Required<WebSocketManagerOptions>;
  private _connectionState: ConnectionState = {
    isConnected: false,
    isReconnecting: false,
    reconnectAttempt: 0
  };

  constructor(options: WebSocketManagerOptions) {
    super();
    this.sessionId = `ws-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    this.options = {
      pingInterval: 30000,
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      debug: false,
      ...options
    };
  }

  get connectionState(): ConnectionState {
    return { ...this._connectionState };
  }

  get isConnected(): boolean {
    return this._connectionState.isConnected;
  }

  connect(): void {
    if (
      this.ws ||
      this.isCleaningUp ||
      this.reconnectAttempts >= this.options.maxReconnectAttempts
    ) {
      return;
    }

    try {
      this.ws = new WebSocket(this.options.url);
      this.setupWebSocket();
    } catch (error) {
      this.handleError('Failed to create WebSocket connection', error);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.cleanup();
  }

  send(data: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.handleError('Cannot send message - connection not open');
      return;
    }

    try {
      this.ws.send(JSON.stringify(data));
    } catch (error) {
      this.handleError('Failed to send message', error);
    }
  }

  private setupWebSocket(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.log('info', 'WebSocket connection established');
      this._connectionState = {
        isConnected: true,
        isReconnecting: false,
        reconnectAttempt: 0
      };
      this.reconnectAttempts = 0;
      this.startPingInterval();
      this.emit('connected');
    };

    this.ws.onclose = (event) => {
      this.log('info', 'WebSocket connection closed', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      
      this.clearPingInterval();
      this._connectionState.isConnected = false;
      
      if (!this.isCleaningUp) {
        this.scheduleReconnect();
      }
      
      this.emit('disconnected', event);
    };

    this.ws.onerror = (error) => {
      this.handleError('WebSocket error', error);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data.toString());
        if (data.type === 'pong') {
          this._connectionState.lastPong = new Date();
          this.emit('pong');
          return;
        }
        this.emit('message', data);
      } catch (error) {
        this.handleError('Failed to parse message', error);
      }
    };
  }

  private startPingInterval(): void {
    this.clearPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this._connectionState.lastPing = new Date();
        this.send({ type: 'ping' });
        this.emit('ping');
      }
    }, this.options.pingInterval);
  }

  private clearPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (
      this.isCleaningUp ||
      this.reconnectAttempts >= this.options.maxReconnectAttempts ||
      this.reconnectTimeout
    ) {
      return;
    }

    this.reconnectAttempts++;
    this._connectionState = {
      ...this._connectionState,
      isConnected: false,
      isReconnecting: true,
      reconnectAttempt: this.reconnectAttempts
    };

    this.emit('reconnecting', this.reconnectAttempts);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, this.options.reconnectInterval);
  }

  private cleanup(): void {
    this.isCleaningUp = true;
    
    this.clearPingInterval();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
    }
    
    this._connectionState = {
      isConnected: false,
      isReconnecting: false,
      reconnectAttempt: 0
    };
    
    this.reconnectAttempts = 0;
    this.isCleaningUp = false;
  }

  private handleError(message: string, error?: unknown): void {
    const errorDetails = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { error };
    
    this.log('error', message, errorDetails);
    this.emit('error', { message, ...errorDetails });
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown) {
    const context = {
      sessionId: this.sessionId,
      connectionState: this._connectionState,
      reconnectAttempts: this.reconnectAttempts,
      ...(data ? { data } : {})
    };

    loggers.websocketServer[level](message, context);
  }
} 