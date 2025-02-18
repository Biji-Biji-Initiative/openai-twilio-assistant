import WebSocket from 'ws';
import { logger } from '../utils/logger';
import { SESSION } from '../constants';

interface WebSocketClient {
  ws: WebSocket;
  isAlive: boolean;
  lastPing: number;
  lastClientPing: number;
}

export class WebSocketService {
  private clients: Map<WebSocket, WebSocketClient> = new Map();
  private heartbeatInterval!: NodeJS.Timeout;

  constructor() {
    this.startHeartbeat();
  }

  addClient(ws: WebSocket) {
    const client: WebSocketClient = {
      ws,
      isAlive: true,
      lastPing: Date.now(),
      lastClientPing: Date.now()
    };

    this.clients.set(ws, client);
    logger.debug('New WebSocket client connected');

    // Set up message handling for client pings
    ws.on('message', (data: WebSocket.RawData) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'ping') {
          client.lastClientPing = Date.now();
          ws.send(JSON.stringify({ type: 'pong' }));
          logger.debug('Received client ping, sent pong');
        }
      } catch (error) {
        logger.warn('Failed to parse client message:', error);
      }
    });

    // Set up ping-pong for this client
    ws.on('pong', () => this.handlePong(client));

    // Set up error handling
    ws.on('error', (error: Error) => {
      logger.error('WebSocket client error:', {
        message: error.message,
        stack: error.stack
      });
      this.removeClient(ws);
    });

    // Set up close handling
    ws.on('close', (code: number, reason: Buffer) => {
      logger.debug('WebSocket client disconnected', {
        code,
        reason: reason.toString()
      });
      this.removeClient(ws);
    });

    // Run heartbeat check immediately for this client
    this.checkClient(client, ws);
  }

  removeClient(ws: WebSocket) {
    if (this.clients.has(ws)) {
      const client = this.clients.get(ws)!;
      logger.info('Removing client', {
        isAlive: client.isAlive,
        lastPing: new Date(client.lastPing).toISOString(),
        lastClientPing: new Date(client.lastClientPing).toISOString()
      });
      this.clients.delete(ws);
      ws.terminate();
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, ws) => this.checkClient(client, ws));
    }, SESSION.CLEANUP_INTERVAL_MS);
  }

  private checkClient(client: WebSocketClient, ws: WebSocket) {
    const now = Date.now();

    // Check if client hasn't responded to ping
    if (!client.isAlive) {
      logger.warn('Client unresponsive to server ping, terminating connection');
      this.removeClient(ws);
      return;
    }

    // Check if client hasn't sent a ping recently
    if (now - client.lastClientPing > SESSION.INACTIVE_THRESHOLD_MS) {
      logger.warn('Client inactive (no client pings), terminating connection');
      this.removeClient(ws);
      return;
    }

    // Check if client is inactive based on server pings
    if (now - client.lastPing > SESSION.INACTIVE_THRESHOLD_MS) {
      logger.warn('Client inactive (no server pings), terminating connection');
      this.removeClient(ws);
      return;
    }

    // Send a ping
    client.isAlive = false;
    ws.ping((error: Error | undefined) => {
      if (error) {
        logger.error('Error sending ping:', {
          message: error.message,
          stack: error.stack
        });
        this.removeClient(ws);
      }
    });
  }

  private handlePong(client: WebSocketClient) {
    client.isAlive = true;
    client.lastPing = Date.now();
  }

  getConnectedClients(): number {
    return this.clients.size;
  }

  shutdown() {
    logger.info('Shutting down WebSocket service');
    clearInterval(this.heartbeatInterval);
    this.clients.forEach((client, ws) => {
      logger.debug('Closing client connection during shutdown', {
        isAlive: client.isAlive,
        lastPing: new Date(client.lastPing).toISOString(),
        lastClientPing: new Date(client.lastClientPing).toISOString()
      });
      this.removeClient(ws);
    });
  }
} 