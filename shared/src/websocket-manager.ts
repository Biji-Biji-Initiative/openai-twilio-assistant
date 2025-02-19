import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { log } from './logger';

export interface WebSocketSession {
  id: string;
  ws: WebSocket;
  lastActivity: Date;
}

export class WebSocketManager {
  private sessions: Map<string, WebSocketSession> = new Map();
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
      this.sessions.forEach((session, id) => {
        const inactiveTime = now - session.lastActivity.getTime();
        if (inactiveTime > this.CONNECTION_TIMEOUT) {
          log.warn('Connection timeout', {
            sessionId: id,
            inactiveTime,
            sessionCount: this.sessions.size
          });
          this.removeSession(id);
        }
      });
    }, this.HEARTBEAT_INTERVAL);
  }

  createSession(ws: WebSocket): string {
    const id = uuidv4();
    const session: WebSocketSession = {
      id,
      ws,
      lastActivity: new Date()
    };

    this.sessions.set(id, session);
    log.info('Created new session', {
      sessionId: id,
      sessionCount: this.sessions.size
    });

    return id;
  }

  getSession(id: string): WebSocketSession | undefined {
    const session = this.sessions.get(id);
    if (session) {
      session.lastActivity = new Date();
    }
    return session;
  }

  removeSession(id: string): void {
    const session = this.sessions.get(id);
    if (session) {
      try {
        session.ws.close();
      } catch (error) {
        log.error('Error closing WebSocket session', error instanceof Error ? error : new Error(String(error)), {
          sessionId: id,
          sessionCount: this.sessions.size
        });
      }
    }
    this.sessions.delete(id);
    log.info('Removed session', {
      sessionId: id,
      sessionCount: this.sessions.size
    });
  }

  async closeAllSessions(): Promise<void> {
    const closePromises: Promise<void>[] = [];

    for (const [id, session] of this.sessions.entries()) {
      closePromises.push(
        new Promise<void>((resolve) => {
          try {
            session.ws.close();
            this.sessions.delete(id);
            log.info('Closed WebSocket session', {
              sessionId: id,
              sessionCount: this.sessions.size
            });
          } catch (error) {
            log.error('Error closing WebSocket session', error instanceof Error ? error : new Error(String(error)), {
              sessionId: id,
              sessionCount: this.sessions.size
            });
          }
          resolve();
        })
      );
    }

    await Promise.all(closePromises);
    clearInterval(this.heartbeatInterval);
    log.info('All WebSocket sessions closed', {
      sessionCount: this.sessions.size
    });
  }

  dispose() {
    clearInterval(this.heartbeatInterval);
    this.closeAllSessions();
  }
} 