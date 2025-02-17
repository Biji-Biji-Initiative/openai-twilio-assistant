import WebSocket from 'ws';
import { logger } from '../utils/logger';
import { formatErrorDetails } from '../utils/error';
import OpenAI from 'openai';

// Constants for connection management
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;

// Track active connections
let currentLogs: WebSocket | null = null;
let currentCall: WebSocket | null = null;

interface ConnectionState {
  type: 'call' | 'logs';
  reconnectAttempts: number;
  lastError?: Error;
}

const connectionStates = new Map<WebSocket, ConnectionState>();

export function getCurrentCall() {
  return currentCall;
}

export function setupWebSocketServer(wss: WebSocket.Server, openaiApiKey: string) {
  const openai = new OpenAI({ apiKey: openaiApiKey });

  wss.on('connection', async (ws: WebSocket, req) => {
    const connectionType = req.url === '/call' ? 'call' : 'logs';
    logger.info(`[WebSocket] New ${connectionType} connection established`);

    // Initialize connection state
    connectionStates.set(ws, {
      type: connectionType,
      reconnectAttempts: 0
    });

    // Store the connection based on type
    if (connectionType === 'call') {
      if (currentCall) {
        logger.warn('[WebSocket] Closing existing call connection');
        currentCall.close(1000, 'New connection replacing old');
      }
      currentCall = ws;
    } else {
      if (currentLogs) {
        logger.warn('[WebSocket] Closing existing logs connection');
        currentLogs.close(1000, 'New connection replacing old');
      }
      currentLogs = ws;
    }

    // Set up heartbeat
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
        logger.debug(`[WebSocket] Sent ping to ${connectionType} connection`);
      }
    }, 30000);

    ws.on('pong', () => {
      logger.debug(`[WebSocket] Received pong from ${connectionType} connection`);
    });

    ws.on('error', (error: Error) => {
      const state = connectionStates.get(ws);
      if (!state) return;

      const errorDetails = formatErrorDetails(error);
      logger.error(`[WebSocket] ${state.type} connection error:`, errorDetails);

      // Update connection state
      connectionStates.set(ws, {
        ...state,
        lastError: error
      });

      // Notify frontend about the error if it's a logs connection
      if (state.type === 'logs' && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({
            type: 'error',
            error: errorDetails.message,
            timestamp: new Date().toISOString()
          }));
        } catch (sendError) {
          logger.error('[WebSocket] Failed to send error to frontend:', formatErrorDetails(sendError));
        }
      }

      // Attempt to reconnect for certain error types
      if (error.message.includes('ECONNRESET') || error.message.includes('ETIMEDOUT')) {
        handleReconnection(ws, state);
      }
    });

    ws.on('close', (code: number, reason: string) => {
      const state = connectionStates.get(ws);
      if (!state) return;

      logger.info(`[WebSocket] ${state.type} connection closed:`, {
        code,
        reason: reason.toString(),
        reconnectAttempts: state.reconnectAttempts
      });

      clearInterval(pingInterval);

      // Clean up references
      if (state.type === 'call' && currentCall === ws) {
        currentCall = null;
      } else if (state.type === 'logs' && currentLogs === ws) {
        currentLogs = null;
      }

      // Attempt to reconnect if not a normal closure
      if (code !== 1000 && code !== 1001) {
        handleReconnection(ws, state);
      }

      connectionStates.delete(ws);
    });

    // Handle messages
    ws.on('message', async (data: string) => {
      const state = connectionStates.get(ws);
      if (!state) return;

      try {
        const message = JSON.parse(data.toString());
        logger.debug(`[WebSocket] Received ${state.type} message:`, message);

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
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'media',
                  payload: response
                }));
              }
            } catch (err) {
              logger.error('[WebSocket] Error processing media message:', formatErrorDetails(err));
            }
          }
        } else {
          // Handle logs-specific messages
          if (message.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          }
        }
      } catch (error) {
        logger.error(`[WebSocket] Error handling ${state.type} message:`, formatErrorDetails(error));
        
        if (ws.readyState === WebSocket.OPEN) {
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

function handleReconnection(ws: WebSocket, state: ConnectionState) {
  if (state.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    logger.error(`[WebSocket] Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached for ${state.type} connection`);
    return;
  }

  const newState = {
    ...state,
    reconnectAttempts: state.reconnectAttempts + 1
  };
  connectionStates.set(ws, newState);

  logger.info(`[WebSocket] Attempting to reconnect ${state.type} connection (attempt ${newState.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

  // Notify frontend about reconnection attempt if it's a logs connection
  if (state.type === 'logs' && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({
        type: 'reconnecting',
        attempt: newState.reconnectAttempts,
        maxAttempts: MAX_RECONNECT_ATTEMPTS,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      logger.error('[WebSocket] Failed to send reconnection status to frontend:', formatErrorDetails(error));
    }
  }

  // Implement exponential backoff
  const delay = RECONNECT_DELAY_MS * Math.pow(2, newState.reconnectAttempts - 1);
  setTimeout(() => {
    if (ws.readyState === WebSocket.CLOSED) {
      // Attempt to establish a new connection
      // This will trigger the 'connection' event handler above
      ws.close();
      // The frontend should handle reconnection based on the 'reconnecting' message
    }
  }, delay);
}

export { currentLogs, currentCall }; 