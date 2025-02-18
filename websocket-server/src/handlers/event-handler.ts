import WebSocket from 'ws';
import { logger } from '../utils/logger';
import { twilioService } from '../services/twilio-service';
import { wsMessageSchema, WebSocketMessage } from '../types/api';

export class WebSocketEventHandler {
  constructor(private ws: WebSocket) {}

  async handleMessage(message: string) {
    try {
      // Parse and validate the message using Zod schema
      const parsedMessage = JSON.parse(message);
      const validatedMessage = await wsMessageSchema.parseAsync(parsedMessage);
      logger.debug('Received validated WebSocket message:', validatedMessage);

      await this.processMessage(validatedMessage);
    } catch (error) {
      logger.error('Error handling WebSocket message:', error);
      if (error instanceof SyntaxError) {
        this.sendError('Invalid JSON message format');
      } else if (error instanceof Error) {
        this.sendError(error.message);
      } else {
        this.sendError('Failed to process message');
      }
    }
  }

  private async processMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'call.action':
        if (message.action === 'disconnect') {
          await twilioService.endCall(message.callSid);
          this.sendSuccess('Call disconnected');
        }
        break;
      
      case 'call.status':
        // Handle call status updates (if needed)
        this.sendSuccess('Status received');
        break;
      
      default:
        // This should never happen due to Zod validation
        this.sendError('Unknown message type');
    }
  }

  private sendSuccess(message: string, data: Record<string, any> = {}) {
    this.send({ success: true, message, ...data });
  }

  private sendError(message: string) {
    this.send({ success: false, message });
  }

  private send(data: Record<string, any>) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
} 