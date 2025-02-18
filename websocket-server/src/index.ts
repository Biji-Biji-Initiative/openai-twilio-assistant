import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

console.log('Environment variables loaded:', {
  PUBLIC_URL: process.env.PUBLIC_URL,
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? '***' : undefined,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? '***' : undefined,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER
});

import { startServer } from './server';
import { logger } from './utils/logger';

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
}); 