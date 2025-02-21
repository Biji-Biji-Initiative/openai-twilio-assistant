import { logger } from './logger';

/**
 * Message types that can be received from WebSocket
 */
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

/**
 * Safely parse a WebSocket message
 */
export function parseMessage(message: string): WebSocketMessage | null {
  try {
    const parsed = JSON.parse(message);
    
    // Validate message structure
    if (!parsed.type || !parsed.data) {
      logger.warning('Received malformed message:', { message });
      return null;
    }

    return {
      type: parsed.type,
      data: parsed.data,
      timestamp: parsed.timestamp || new Date().toISOString()
    };
  } catch (error) {
    logger.error('Failed to parse WebSocket message', error as Error);
    logger.warning('Raw message:', { message });
    return null;
  }
}

/**
 * Handle a parsed WebSocket message
 */
export function handleMessage(message: WebSocketMessage): void {
  try {
    switch (message.type) {
      case 'call_started':
        logger.info(`Call started: ${message.data.callSid}`);
        break;
      
      case 'call_ended':
        logger.info(`Call ended: ${message.data.callSid}, duration: ${message.data.duration}s`);
        break;
      
      case 'transcription':
        logger.info(`Transcription: ${message.data.text}`);
        break;
      
      case 'error':
        logger.error(`WebSocket error: ${message.data.message}`, new Error(message.data.stack));
        break;
      
      default:
        logger.warning(`Unknown message type: ${message.type}`, { data: message.data });
    }
  } catch (error) {
    logger.error('Failed to handle WebSocket message', error as Error);
  }
}

/**
 * Process an incoming WebSocket message
 */
export function processWebSocketMessage(rawMessage: string): void {
  const message = parseMessage(rawMessage);
  if (message) {
    handleMessage(message);
  }
}
