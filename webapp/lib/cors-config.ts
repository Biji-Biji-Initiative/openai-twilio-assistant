import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

export const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8081',
  /\.ngrok\.io$/,
  /\.ngrok\.app$/,
  /^https?:\/\/[a-zA-Z0-9-]+\.ngrok-free\.app$/
];

export const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];

export const allowedHeaders = [
  'Origin',
  'X-Requested-With',
  'Content-Type',
  'Accept',
  'Authorization',
  'Access-Control-Allow-Origin',
  'Access-Control-Allow-Credentials',
  'Cache-Control',
  'Pragma'
];

export const exposedHeaders = [
  'Content-Length',
  'Content-Type',
  'Access-Control-Allow-Origin'
];

export function isOriginAllowed(origin: string | undefined): boolean {
  // Allow requests with no origin (like mobile apps or curl)
  if (!origin) {
    logger.debug('[CORS] Allowing request with no origin');
    return true;
  }

  // Always allow in development
  if (env.NODE_ENV === 'development') {
    logger.debug(`[CORS] Development mode - allowing origin: ${origin}`);
    return true;
  }

  // Check if origin matches allowed patterns
  const isAllowed = allowedOrigins.some(pattern => {
    if (typeof pattern === 'string') {
      return pattern === origin;
    }
    return pattern.test(origin);
  });

  if (isAllowed) {
    logger.debug(`[CORS] Allowing origin: ${origin}`);
  } else {
    logger.warn(`[CORS] Rejected origin: ${origin}`);
  }

  return isAllowed;
} 