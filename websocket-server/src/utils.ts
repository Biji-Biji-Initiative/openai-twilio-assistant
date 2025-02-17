import { logger } from "./utils/logger";
import twilio from "twilio";
import VoiceResponse from "twilio/lib/twiml/VoiceResponse";

interface ErrorDetails {
  message: string;
  name?: string;
  stack?: string;
  code?: string | number;
}

export function formatErrorDetails(error: Error | unknown): ErrorDetails {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: (error as any).code
    };
  }
  return {
    message: String(error)
  };
}

export class WebSocketError extends Error {
  code: number;
  
  constructor(message: string, code: number = 1011) {
    super(message);
    this.name = 'WebSocketError';
    this.code = code;
  }
}

const ALLOWED_ORIGINS = {
  localhost: /^https?:\/\/localhost(:\d+)?$/,
  
  ngrok: /^https?:\/\/[a-zA-Z0-9-]+\.(ngrok\.io|ngrok\.app|ngrok-free\.app)$/,
  
  production: [
    'mereka.ngrok.io'
  ]
};

export function isOriginAllowed(origin: string): boolean {
  logger.debug(`[CORS] Checking origin: ${origin}`);

  if (!origin && process.env.NODE_ENV === 'development') {
    logger.warn('[CORS] Allowing request with no origin (development only)');
    return true;
  }

  if (ALLOWED_ORIGINS.localhost.test(origin)) {
    logger.debug('[CORS] Allowing localhost origin');
    return true;
  }

  if (ALLOWED_ORIGINS.ngrok.test(origin)) {
    logger.debug('[CORS] Allowing ngrok origin');
    return true;
  }

  const isAllowed = ALLOWED_ORIGINS.production.includes(origin);
  logger.debug(`[CORS] Origin ${origin} allowed: ${isAllowed}`);
  return isAllowed;
}

export function verifyWebSocketClient(
  info: { origin: string; secure: boolean; req: any }
): boolean {
  const origin = info.origin;
  logger.info(`[WebSocket] Verifying client connection from origin: ${origin}`);

  try {
    if (!origin) {
      throw new WebSocketError('Origin not provided', 1003);
    }

    if (!isOriginAllowed(origin)) {
      throw new WebSocketError('Origin not allowed', 1008);
    }

    if (process.env.NODE_ENV === 'production' && !info.secure) {
      throw new WebSocketError('Secure connection required', 1015);
    }

    logger.info(`[WebSocket] Accepted connection from origin: ${origin}`);
    return true;
  } catch (error) {
    logger.error('[WebSocket] Connection verification failed:', formatErrorDetails(error));
    throw error;
  }
}

export function generateStreamingTwiML(publicUrl: string, greeting?: string): VoiceResponse {
  if (!publicUrl) {
    throw new Error('Public URL is required for streaming TwiML generation');
  }

  const twiml = new twilio.twiml.VoiceResponse();

  if (greeting) {
    twiml.say(greeting);
  }

  twiml.connect().stream({
    url: `${publicUrl}/call`,
    statusCallback: `${publicUrl}/status-callback`,
    statusCallbackMethod: 'POST'
  });

  twiml.say('Disconnected');

  return twiml;
}

export function logCallDetails(
  context: string,
  details: Record<string, any>,
  message: string
): void {
  logger.info(`[${context}] ${message}`, {
    ...details,
    timestamp: new Date().toISOString()
  });
} 