import { CorsOptions } from 'cors';
import { IncomingMessage } from 'http';

export interface WebSocketInfo {
  origin: string;
  secure: boolean;
  req: IncomingMessage;
}

export const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  'https://localhost:3000',
  'https://localhost:8080'
];

export const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];

export const allowedHeaders = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Origin',
  'Cache-Control',
  'Pragma'
];

export const exposedHeaders = [
  'Content-Length',
  'Content-Type'
];

export const corsOptions: CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: allowedMethods,
  allowedHeaders,
  exposedHeaders
};

export const verifyWebSocketClient = (info: WebSocketInfo): boolean => {
  const origin = info.origin;
  return allowedOrigins.includes(origin);
}; 