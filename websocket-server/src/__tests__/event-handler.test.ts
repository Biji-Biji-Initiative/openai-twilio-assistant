/// <reference types="jest" />
import WebSocket from 'ws';
import { WebSocketEventHandler } from '../handlers/event-handler';
import { twilioService } from '../services/twilio-service';

// Mock dependencies
jest.mock('../services/twilio-service', () => ({
  twilioService: {
    endCall: jest.fn()
  }
}));

describe('WebSocketEventHandler', () => {
  let handler: WebSocketEventHandler;
  let mockWs: jest.Mocked<WebSocket>;
  let sentMessages: Array<Record<string, unknown>>;
  let wsReadyState: number;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    sentMessages = [];
    wsReadyState = WebSocket.OPEN;

    // Create mock WebSocket
    mockWs = {
      send: jest.fn((data: string) => sentMessages.push(JSON.parse(data))),
      get readyState() { return wsReadyState; },
      set readyState(value: number) { wsReadyState = value; }
    } as unknown as jest.Mocked<WebSocket>;

    // Create handler instance
    handler = new WebSocketEventHandler(mockWs);
  });

  describe('Message Handling', () => {
    it('should handle valid disconnect message', async () => {
      const message = {
        type: 'call.action',
        action: 'disconnect',
        callSid: 'CA123'
      };

      await handler.handleMessage(JSON.stringify(message));

      expect(twilioService.endCall).toHaveBeenCalledWith('CA123');
      expect(sentMessages[0]).toEqual({
        success: true,
        message: 'Call disconnected'
      });
    });

    it('should handle call status update', async () => {
      const message = {
        type: 'call.status',
        callSid: 'CA123',
        status: 'completed',
        duration: 60
      };

      await handler.handleMessage(JSON.stringify(message));

      expect(sentMessages[0]).toEqual({
        success: true,
        message: 'Status received'
      });
    });

    it('should handle invalid JSON', async () => {
      await handler.handleMessage('invalid json');

      expect(sentMessages[0]).toEqual({
        success: false,
        message: 'Invalid JSON message format'
      });
    });

    it('should handle invalid message schema', async () => {
      const message = {
        type: 'invalid.type',
        data: 'test'
      };

      await handler.handleMessage(JSON.stringify(message));

      expect(sentMessages[0]).toEqual({
        success: false,
        message: expect.stringContaining('Invalid discriminator value')
      });
    });
  });

  describe('WebSocket State', () => {
    it('should not send message if connection is not open', async () => {
      wsReadyState = WebSocket.CLOSED;

      const message = {
        type: 'call.action',
        action: 'disconnect',
        callSid: 'CA123'
      };

      await handler.handleMessage(JSON.stringify(message));

      expect(mockWs.send).not.toHaveBeenCalled();
    });
  });
}); 