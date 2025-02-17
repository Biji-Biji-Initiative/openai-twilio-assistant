"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.currentCall = exports.currentLogs = void 0;
exports.getCurrentCall = getCurrentCall;
exports.setupWebSocketServer = setupWebSocketServer;
const ws_1 = __importDefault(require("ws"));
const logger_1 = require("../utils/logger");
const error_1 = require("../utils/error");
const openai_1 = __importDefault(require("openai"));
// Constants for connection management
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;
// Track active connections
let currentLogs = null;
exports.currentLogs = currentLogs;
let currentCall = null;
exports.currentCall = currentCall;
const connectionStates = new Map();
function getCurrentCall() {
    return currentCall;
}
function setupWebSocketServer(wss, openaiApiKey) {
    const openai = new openai_1.default({ apiKey: openaiApiKey });
    wss.on('connection', async (ws, req) => {
        const connectionType = req.url === '/call' ? 'call' : 'logs';
        logger_1.logger.info(`[WebSocket] New ${connectionType} connection established`);
        // Initialize connection state
        connectionStates.set(ws, {
            type: connectionType,
            reconnectAttempts: 0
        });
        // Store the connection based on type
        if (connectionType === 'call') {
            if (currentCall) {
                logger_1.logger.warn('[WebSocket] Closing existing call connection');
                currentCall.close(1000, 'New connection replacing old');
            }
            exports.currentCall = currentCall = ws;
        }
        else {
            if (currentLogs) {
                logger_1.logger.warn('[WebSocket] Closing existing logs connection');
                currentLogs.close(1000, 'New connection replacing old');
            }
            exports.currentLogs = currentLogs = ws;
        }
        // Set up heartbeat
        const pingInterval = setInterval(() => {
            if (ws.readyState === ws_1.default.OPEN) {
                ws.ping();
                logger_1.logger.debug(`[WebSocket] Sent ping to ${connectionType} connection`);
            }
        }, 30000);
        ws.on('pong', () => {
            logger_1.logger.debug(`[WebSocket] Received pong from ${connectionType} connection`);
        });
        ws.on('error', (error) => {
            const state = connectionStates.get(ws);
            if (!state)
                return;
            const errorDetails = (0, error_1.formatErrorDetails)(error);
            logger_1.logger.error(`[WebSocket] ${state.type} connection error:`, errorDetails);
            // Update connection state
            connectionStates.set(ws, {
                ...state,
                lastError: error
            });
            // Notify frontend about the error if it's a logs connection
            if (state.type === 'logs' && ws.readyState === ws_1.default.OPEN) {
                try {
                    ws.send(JSON.stringify({
                        type: 'error',
                        error: errorDetails.message,
                        timestamp: new Date().toISOString()
                    }));
                }
                catch (sendError) {
                    logger_1.logger.error('[WebSocket] Failed to send error to frontend:', (0, error_1.formatErrorDetails)(sendError));
                }
            }
            // Attempt to reconnect for certain error types
            if (error.message.includes('ECONNRESET') || error.message.includes('ETIMEDOUT')) {
                handleReconnection(ws, state);
            }
        });
        ws.on('close', (code, reason) => {
            const state = connectionStates.get(ws);
            if (!state)
                return;
            logger_1.logger.info(`[WebSocket] ${state.type} connection closed:`, {
                code,
                reason: reason.toString(),
                reconnectAttempts: state.reconnectAttempts
            });
            clearInterval(pingInterval);
            // Clean up references
            if (state.type === 'call' && currentCall === ws) {
                exports.currentCall = currentCall = null;
            }
            else if (state.type === 'logs' && currentLogs === ws) {
                exports.currentLogs = currentLogs = null;
            }
            // Attempt to reconnect if not a normal closure
            if (code !== 1000 && code !== 1001) {
                handleReconnection(ws, state);
            }
            connectionStates.delete(ws);
        });
        // Handle messages
        ws.on('message', async (data) => {
            const state = connectionStates.get(ws);
            if (!state)
                return;
            try {
                const message = JSON.parse(data.toString());
                logger_1.logger.debug(`[WebSocket] Received ${state.type} message:`, message);
                // Reset reconnect attempts on successful message
                if (state.reconnectAttempts > 0) {
                    connectionStates.set(ws, {
                        ...state,
                        reconnectAttempts: 0
                    });
                }
                // Handle message based on type
                if (state.type === 'call') {
                    // Handle call-specific messages
                    if (message.type === 'media') {
                        // Process media message
                        try {
                            const response = await openai.audio.speech.create({
                                model: "tts-1",
                                voice: message.voice || "alloy",
                                input: message.text
                            });
                            // Send response back to the call
                            if (ws.readyState === ws_1.default.OPEN) {
                                ws.send(JSON.stringify({
                                    type: 'media',
                                    payload: response
                                }));
                            }
                        }
                        catch (err) {
                            logger_1.logger.error('[WebSocket] Error processing media message:', (0, error_1.formatErrorDetails)(err));
                        }
                    }
                }
                else {
                    // Handle logs-specific messages
                    if (message.type === 'ping') {
                        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
                    }
                }
            }
            catch (error) {
                logger_1.logger.error(`[WebSocket] Error handling ${state.type} message:`, (0, error_1.formatErrorDetails)(error));
                if (ws.readyState === ws_1.default.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        error: 'Failed to process message',
                        timestamp: new Date().toISOString()
                    }));
                }
            }
        });
    });
}
function handleReconnection(ws, state) {
    if (state.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        logger_1.logger.error(`[WebSocket] Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached for ${state.type} connection`);
        return;
    }
    const newState = {
        ...state,
        reconnectAttempts: state.reconnectAttempts + 1
    };
    connectionStates.set(ws, newState);
    logger_1.logger.info(`[WebSocket] Attempting to reconnect ${state.type} connection (attempt ${newState.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    // Notify frontend about reconnection attempt if it's a logs connection
    if (state.type === 'logs' && ws.readyState === ws_1.default.OPEN) {
        try {
            ws.send(JSON.stringify({
                type: 'reconnecting',
                attempt: newState.reconnectAttempts,
                maxAttempts: MAX_RECONNECT_ATTEMPTS,
                timestamp: new Date().toISOString()
            }));
        }
        catch (error) {
            logger_1.logger.error('[WebSocket] Failed to send reconnection status to frontend:', (0, error_1.formatErrorDetails)(error));
        }
    }
    // Implement exponential backoff
    const delay = RECONNECT_DELAY_MS * Math.pow(2, newState.reconnectAttempts - 1);
    setTimeout(() => {
        if (ws.readyState === ws_1.default.CLOSED) {
            // Attempt to establish a new connection
            // This will trigger the 'connection' event handler above
            ws.close();
            // The frontend should handle reconnection based on the 'reconnecting' message
        }
    }, delay);
}
//# sourceMappingURL=ws-handler.js.map