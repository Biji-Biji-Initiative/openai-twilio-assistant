import cors from 'cors';
import { env } from '../config/environment';
import { logger } from '../utils/logger';

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8081',
  /\.ngrok\.io$/,
  /\.ngrok\.app$/,
  /^https?:\/\/[a-zA-Z0-9-]+\.ngrok-free\.app$/
];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    logger.debug(`[CORS] Checking origin: ${origin}`);
    
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      logger.debug('[CORS] Allowing request with no origin');
      callback(null, true);
      return;
    }

    // Always allow in development
    if (env.NODE_ENV === 'development') {
      logger.debug(`[CORS] Development mode - allowing origin: ${origin}`);
      callback(null, true);
      return;
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
      callback(null, true);
    } else {
      logger.warn(`[CORS] Rejected origin: ${origin}`);
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials'
  ],
  exposedHeaders: ['Access-Control-Allow-Origin'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}); 