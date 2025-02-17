export { default as logger } from './logger';

// CORS utilities
export function isOriginAllowed(origin: string): boolean {
  const allowedOrigins = [
    'http://localhost',
    'https://localhost',
    'http://127.0.0.1',
    'https://127.0.0.1',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://localhost:3000',
    'https://localhost:3001'
  ];
  
  return allowedOrigins.some(allowed => 
    origin.startsWith(allowed) || 
    origin.includes('.ngrok.io') || 
    origin.includes('.ngrok-free.app')
  );
}

// Error formatting
export function formatErrorDetails(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack
    };
  }
  return {
    message: String(error)
  };
}

// WebSocket validation
export function verifyWebSocketClient(origin: string | undefined): boolean {
  if (!origin) {
    return false;
  }
  return isOriginAllowed(origin);
} 