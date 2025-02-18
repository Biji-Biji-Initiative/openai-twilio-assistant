import WebSocket from 'ws';
import { loggers } from '@twilio/shared/logger';

const logger = loggers.websocketServer;

interface Session {
  id: string;
  ws: WebSocket;
  lastActivity: Date;
  callSid?: string;
}

export class SessionService {
  private sessions: Map<string, Session> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private readonly cleanupIntervalMs: number = 30000) {
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
    logger.info('Session service initialized', {
      cleanupIntervalMs
    });
  }

  createSession(ws: WebSocket): string {
    const sessionId = this.generateSessionId();
    this.sessions.set(sessionId, {
      id: sessionId,
      ws,
      lastActivity: new Date(),
    });
    
    logger.info('Session created', { 
      sessionId,
      totalSessions: this.sessions.size
    });
    
    return sessionId;
  }

  updateSession(sessionId: string, updates: Partial<Session>) {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates, { lastActivity: new Date() });
      this.sessions.set(sessionId, session);
      
      logger.debug('Session updated', { 
        sessionId,
        updates: {
          ...updates,
          ws: undefined // Don't log the WebSocket instance
        }
      });
    } else {
      logger.warn('Attempted to update non-existent session', { sessionId });
    }
  }

  getSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      logger.debug('Session accessed', { sessionId });
      return session;
    }
    logger.warn('Session not found', { sessionId });
    return undefined;
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  removeSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      logger.info('Session removed', { 
        sessionId,
        remainingSessions: this.sessions.size
      });
    } else {
      logger.warn('Attempted to remove non-existent session', { sessionId });
    }
  }

  private cleanup() {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      const inactiveTime = now.getTime() - session.lastActivity.getTime();
      if (inactiveTime > this.cleanupIntervalMs * 2) {
        if (session.ws.readyState === WebSocket.OPEN) {
          session.ws.close();
        }
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up inactive sessions', {
        cleanedCount,
        remainingSessions: this.sessions.size
      });
    }
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  dispose() {
    clearInterval(this.cleanupInterval);
    
    // Close all active sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.ws.readyState === WebSocket.OPEN) {
        session.ws.close();
      }
    }
    
    const sessionCount = this.sessions.size;
    this.sessions.clear();
    
    logger.info('Session service disposed', {
      closedSessions: sessionCount
    });
  }
}

export const sessionService = new SessionService(); 