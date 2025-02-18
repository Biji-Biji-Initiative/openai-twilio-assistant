"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketManager = void 0;
const ws_1 = __importDefault(require("ws"));
const events_1 = require("events");
const logger_1 = require("./logger");
class WebSocketManager extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.ws = null;
        this.pingInterval = null;
        this.reconnectTimeout = null;
        this.reconnectAttempts = 0;
        this.isCleaningUp = false;
        this._connectionState = {
            isConnected: false,
            isReconnecting: false,
            reconnectAttempt: 0
        };
        this.sessionId = `ws-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        this.options = {
            pingInterval: 30000,
            reconnectInterval: 5000,
            maxReconnectAttempts: 5,
            debug: false,
            ...options
        };
    }
    get connectionState() {
        return { ...this._connectionState };
    }
    get isConnected() {
        return this._connectionState.isConnected;
    }
    connect() {
        if (this.ws ||
            this.isCleaningUp ||
            this.reconnectAttempts >= this.options.maxReconnectAttempts) {
            return;
        }
        try {
            this.ws = new ws_1.default(this.options.url);
            this.setupWebSocket();
        }
        catch (error) {
            this.handleError('Failed to create WebSocket connection', error);
            this.scheduleReconnect();
        }
    }
    disconnect() {
        this.cleanup();
    }
    send(data) {
        if (!this.ws || this.ws.readyState !== ws_1.default.OPEN) {
            this.handleError('Cannot send message - connection not open');
            return;
        }
        try {
            this.ws.send(JSON.stringify(data));
        }
        catch (error) {
            this.handleError('Failed to send message', error);
        }
    }
    setupWebSocket() {
        if (!this.ws)
            return;
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
            }
            catch (error) {
                this.handleError('Failed to parse message', error);
            }
        };
    }
    startPingInterval() {
        this.clearPingInterval();
        this.pingInterval = setInterval(() => {
            var _a;
            if (((_a = this.ws) === null || _a === void 0 ? void 0 : _a.readyState) === ws_1.default.OPEN) {
                this._connectionState.lastPing = new Date();
                this.send({ type: 'ping' });
                this.emit('ping');
            }
        }, this.options.pingInterval);
    }
    clearPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    scheduleReconnect() {
        if (this.isCleaningUp ||
            this.reconnectAttempts >= this.options.maxReconnectAttempts ||
            this.reconnectTimeout) {
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
    cleanup() {
        this.isCleaningUp = true;
        this.clearPingInterval();
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.ws) {
            if (this.ws.readyState === ws_1.default.OPEN) {
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
    handleError(message, error) {
        const errorDetails = error instanceof Error
            ? { message: error.message, stack: error.stack }
            : { error };
        this.log('error', message, errorDetails);
        this.emit('error', { message, ...errorDetails });
    }
    log(level, message, data) {
        const context = {
            sessionId: this.sessionId,
            connectionState: this._connectionState,
            reconnectAttempts: this.reconnectAttempts,
            ...(data ? { data } : {})
        };
        logger_1.loggers.websocketServer[level](message, context);
    }
}
exports.WebSocketManager = WebSocketManager;
