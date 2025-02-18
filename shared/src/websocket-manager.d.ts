import { EventEmitter } from 'events';
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
export declare class WebSocketManager extends EventEmitter {
    private ws;
    private pingInterval;
    private reconnectTimeout;
    private reconnectAttempts;
    private isCleaningUp;
    private readonly sessionId;
    private readonly options;
    private _connectionState;
    constructor(options: WebSocketManagerOptions);
    get connectionState(): ConnectionState;
    get isConnected(): boolean;
    connect(): void;
    disconnect(): void;
    send(data: unknown): void;
    private setupWebSocket;
    private startPingInterval;
    private clearPingInterval;
    private scheduleReconnect;
    private cleanup;
    private handleError;
    private log;
}
