/// <reference types="jest" />
import WebSocket from 'ws';
import { WebSocketService } from '../services/ws-service';
import { SESSION } from '../constants';

// Mock WebSocket
jest.mock('ws');

describe('WebSocketService', () => {
  let wsService: WebSocketService;
  let mockWs: jest.Mocked<WebSocket>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a mock WebSocket instance
    mockWs = new WebSocket(null) as jest.Mocked<WebSocket>;
    mockWs.terminate = jest.fn();
    mockWs.ping = jest.fn();
    mockWs.on = jest.fn();
    
    // Create a new service instance
    wsService = new WebSocketService();
  });

  afterEach(() => {
    wsService.shutdown();
  });

  describe('Client Management', () => {
    it('should add new client successfully', () => {
      wsService.addClient(mockWs);
      expect(wsService.getConnectedClients()).toBe(1);
    });

    it('should remove client successfully', () => {
      wsService.addClient(mockWs);
      wsService.removeClient(mockWs);
      expect(wsService.getConnectedClients()).toBe(0);
      expect(mockWs.terminate).toHaveBeenCalled();
    });

    it('should set up event listeners when adding client', () => {
      wsService.addClient(mockWs);
      expect(mockWs.on).toHaveBeenCalledWith('pong', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function));
    });
  });

  describe('Health Checks', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should ping clients at regular intervals', () => {
      wsService.addClient(mockWs);
      
      // Advance time and run all pending timers
      jest.advanceTimersByTime(SESSION.CLEANUP_INTERVAL_MS);
      jest.runOnlyPendingTimers();
      
      expect(mockWs.ping).toHaveBeenCalled();
    });

    it('should remove unresponsive clients', () => {
      wsService.addClient(mockWs);
      
      // Simulate a failed ping
      mockWs.ping.mockImplementation((cb: (error?: Error) => void) => {
        cb(new Error('Ping failed'));
        // Ensure the client is removed before continuing
        process.nextTick(() => {
          expect(wsService.getConnectedClients()).toBe(0);
          expect(mockWs.terminate).toHaveBeenCalled();
        });
      });
      
      // Advance time and run all pending timers
      jest.advanceTimersByTime(SESSION.CLEANUP_INTERVAL_MS);
      jest.runOnlyPendingTimers();
    });

    it('should remove inactive clients', () => {
      wsService.addClient(mockWs);
      
      // Advance time beyond inactive threshold and run all pending timers
      jest.advanceTimersByTime(SESSION.INACTIVE_THRESHOLD_MS + SESSION.CLEANUP_INTERVAL_MS);
      jest.runOnlyPendingTimers();
      
      // Ensure the client is removed before continuing
      process.nextTick(() => {
        expect(wsService.getConnectedClients()).toBe(0);
        expect(mockWs.terminate).toHaveBeenCalled();
      });
    });
  });

  describe('Shutdown', () => {
    it('should terminate all connections on shutdown', () => {
      const mockWs2 = new WebSocket(null) as jest.Mocked<WebSocket>;
      mockWs2.terminate = jest.fn();
      mockWs2.ping = jest.fn();
      mockWs2.on = jest.fn();

      wsService.addClient(mockWs);
      wsService.addClient(mockWs2);
      
      wsService.shutdown();
      
      expect(mockWs.terminate).toHaveBeenCalled();
      expect(mockWs2.terminate).toHaveBeenCalled();
      expect(wsService.getConnectedClients()).toBe(0);
    });
  });
}); 