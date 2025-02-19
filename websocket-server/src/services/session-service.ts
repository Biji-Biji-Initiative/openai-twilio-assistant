import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { log } from '@twilio/shared';

// Connection states for monitoring
enum ConnectionState {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  DISCONNECTED = 'DISCONNECTED',
  FAILED = 'FAILED'
}

// Extended WebSocket interface with heartbeat
interface LiveWebSocket extends WebSocket {
  isAlive: boolean;
  sessionId: string;
  state: ConnectionState;
  lastActivity: Date;
}

export class SessionService {
  private sessions: Map<string, LiveWebSocket> = new Map();
  private heartbeatInterval: NodeJS.Timeout = setInterval(() => {}, 0);
  private readonly HEARTBEAT_INTERVAL = 30000;
  private readonly CONNECTION_TIMEOUT = 5000;

  constructor() {
    clearInterval(this.heartbeatInterval);
    this.startHeartbeat();
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      this.sessions.forEach((ws, sessionId) => {
        if (!ws.isAlive) {
          const stats = this.getConnectionStats();
          log.warn('Terminating inactive WebSocket connection', {
            sessionId,
            lastActivity: ws.lastActivity.toISOString(),
            state: ws.state,
            sessionCount: this.sessions.size,
            stats
          });
          this.removeSession(sessionId);
          return;
        }

        // Check for connection timeout
        const inactiveTime = now - ws.lastActivity.getTime();
        if (inactiveTime > this.CONNECTION_TIMEOUT) {
          const stats = this.getConnectionStats();
          log.warn('Connection timeout', {
            sessionId,
            inactiveTime,
            state: ws.state,
            sessionCount: this.sessions.size,
            stats
          });
          ws.state = ConnectionState.FAILED;
          this.removeSession(sessionId);
          return;
        }

        ws.isAlive = false;
        ws.ping(() => {
          ws.isAlive = true;
          ws.lastActivity = new Date();
        });
      });
    }, this.HEARTBEAT_INTERVAL);
  }

  createSession(ws: WebSocket): string {
    const sessionId = uuidv4();
    const liveWs = ws as LiveWebSocket;
    
    liveWs.isAlive = true;
    liveWs.sessionId = sessionId;
    liveWs.state = ConnectionState.CONNECTING;
    liveWs.lastActivity = new Date();

    // Setup pong handler for heartbeat
    liveWs.on('pong', () => {
      liveWs.isAlive = true;
      liveWs.lastActivity = new Date();
      if (liveWs.state === ConnectionState.CONNECTING) {
        liveWs.state = ConnectionState.CONNECTED;
        const stats = this.getConnectionStats();
        log.info('WebSocket connection established', {
          sessionId,
          state: liveWs.state,
          sessionCount: this.sessions.size,
          stats
        });
      }
    });

    this.sessions.set(sessionId, liveWs);
    const stats = this.getConnectionStats();
    log.info('Created new session', {
      sessionId,
      state: liveWs.state,
      sessionCount: this.sessions.size,
      stats
    });

    return sessionId;
  }

  getSession(sessionId: string): WebSocket | undefined {
    const ws = this.sessions.get(sessionId);
    if (ws) {
      ws.lastActivity = new Date();
    }
    return ws;
  }

  removeSession(sessionId: string): void {
    const ws = this.sessions.get(sessionId);
    if (ws) {
      try {
        ws.state = ConnectionState.DISCONNECTED;
        ws.close();
      } catch (error) {
        const stats = this.getConnectionStats();
        log.error('Error closing WebSocket session', error instanceof Error ? error : new Error(String(error)), {
          sessionId,
          state: ws.state,
          sessionCount: this.sessions.size,
          stats
        });
      }
    }
    this.sessions.delete(sessionId);
    const stats = this.getConnectionStats();
    log.info('Removed session', {
      sessionId,
      sessionCount: this.sessions.size,
      stats
    });
  }

  getAllSessions(): Map<string, WebSocket> {
    return this.sessions;
  }

  getConnectionStats(): {
    total: number;
    connected: number;
    connecting: number;
    reconnecting: number;
    disconnected: number;
    failed: number;
  } {
    const stats = {
      total: this.sessions.size,
      connected: 0,
      connecting: 0,
      reconnecting: 0,
      disconnected: 0,
      failed: 0
    };

    this.sessions.forEach(ws => {
      switch (ws.state) {
        case ConnectionState.CONNECTED:
          stats.connected++;
          break;
        case ConnectionState.CONNECTING:
          stats.connecting++;
          break;
        case ConnectionState.RECONNECTING:
          stats.reconnecting++;
          break;
        case ConnectionState.DISCONNECTED:
          stats.disconnected++;
          break;
        case ConnectionState.FAILED:
          stats.failed++;
          break;
      }
    });

    return stats;
  }

  async closeAllSessions(): Promise<void> {
    const closePromises: Promise<void>[] = [];

    for (const [sessionId, ws] of this.sessions.entries()) {
      closePromises.push(
        new Promise<void>((resolve) => {
          try {
            ws.state = ConnectionState.DISCONNECTED;
            ws.close(1000, 'Server shutting down');
            this.sessions.delete(sessionId);
            const stats = this.getConnectionStats();
            log.info('Closed WebSocket session', {
              sessionId,
              state: ws.state,
              sessionCount: this.sessions.size,
              stats
            });
          } catch (error) {
            const stats = this.getConnectionStats();
            log.error('Error closing WebSocket session', error instanceof Error ? error : new Error(String(error)), {
              sessionId,
              state: ws.state,
              sessionCount: this.sessions.size,
              stats
            });
          }
          resolve();
        })
      );
    }

    await Promise.all(closePromises);
    clearInterval(this.heartbeatInterval);
    const stats = this.getConnectionStats();
    log.info('All WebSocket sessions closed', {
      sessionCount: this.sessions.size,
      stats
    });
  }

  dispose() {
    clearInterval(this.heartbeatInterval);
    this.closeAllSessions();
  }
}

export const sessionService = new SessionService(); 