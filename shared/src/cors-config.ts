import { CorsOptions } from 'cors';
import { IncomingMessage } from 'http';
import { log } from './logger';

export interface WebSocketInfo {
  origin: string;
  secure: boolean;
  req: IncomingMessage;
}

export interface CorsConfig {
  corsOptions: CorsOptions;
  verifyWebSocketClient: (info: WebSocketInfo) => boolean;
}

export function createCorsConfig(allowedOrigins: string[]): CorsConfig {
  const isOriginAllowed = (origin: string): boolean => {
    if (!origin) return false;
    return allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin === '*') return true;
      if (allowedOrigin.startsWith('*.')) {
        const domain = allowedOrigin.slice(2);
        return origin.endsWith(domain);
      }
      return origin === allowedOrigin;
    });
  };

  return {
    corsOptions: {
      origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
          log.info('Allowing request with no origin', { type: 'cors' });
          callback(null, true);
          return;
        }

        // In development, be more permissive with CORS
        if (process.env.NODE_ENV === 'development') {
          log.info('Development mode - allowing origin', { type: 'cors', origin });
          callback(null, true);
          return;
        }

        if (isOriginAllowed(origin)) {
          log.info('Allowing origin', { type: 'cors', origin });
          callback(null, true);
        } else {
          log.warn('Rejected origin', { type: 'cors', origin });
          callback(new Error('CORS not allowed'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Cache-Control',
        'Pragma',
        'Accept',
        'Origin'
      ],
      exposedHeaders: ['Content-Length', 'Content-Type']
    },

    verifyWebSocketClient: (info: WebSocketInfo) => {
      const origin = info.origin;
      if (process.env.NODE_ENV === 'development') {
        log.info('Development mode - allowing origin', { type: 'websocket', origin });
        return true;
      }
      
      if (isOriginAllowed(origin)) {
        log.info('Allowing origin', { type: 'websocket', origin });
        return true;
      }
      
      log.warn('Rejected origin', { type: 'websocket', origin });
      return false;
    }
  };
} 