import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/app/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { ErrorResponseSchema, SuccessResponseSchema } from '@/lib/validation-schemas';

type Environment = 'development' | 'production';
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * API Error types for consistent error handling
 */
export enum APIError {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  TWILIO_ERROR = 'TWILIO_ERROR',
  OPENAI_ERROR = 'OPENAI_ERROR',
  WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR'
}

/**
 * CORS configuration based on environment
 */
const ALLOWED_ORIGINS: Record<Environment, (string | RegExp)[]> = {
  development: [
    'http://localhost:3000',
    'http://localhost:8081',
    /^https?:\/\/[a-zA-Z0-9-]+\.ngrok\.io$/,
    /^https?:\/\/[a-zA-Z0-9-]+\.ngrok-free\.app$/
  ],
  production: [
    'https://mereka.ngrok.io'
  ]
};

/**
 * Security headers for all responses
 */
const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

/**
 * CORS headers configuration
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, Accept',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Type'
};

/**
 * Handle CORS for API requests
 * @param req - The incoming request
 * @returns Headers object or Response for preflight
 */
export function handleCors(req: NextRequest) {
  const origin = req.headers.get('origin');
  const env = (process.env.NODE_ENV || 'development') as Environment;
  
  // Create base response headers
  const headers = new Headers({
    ...CORS_HEADERS,
    ...SECURITY_HEADERS
  });

  // Handle origin validation
  if (origin) {
    const isAllowed = ALLOWED_ORIGINS[env].some((allowed: string | RegExp) => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });

    if (isAllowed) {
      logger.info(`[CORS] Allowing origin: ${origin}`);
      headers.set('Access-Control-Allow-Origin', origin);
    } else {
      logger.warn(`[CORS] Rejected origin: ${origin}`);
    }
  } else if (env === 'development') {
    logger.warn('[CORS] No origin provided (allowed in development)');
    headers.set('Access-Control-Allow-Origin', '*');
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { 
      status: 204,
      headers
    });
  }

  return headers;
}

interface ErrorDetails {
  message: string;
  name?: string;
  stack?: string;
  code?: string | number;
  type?: APIError;
}

/**
 * Format error details for consistent error responses
 */
function formatErrorDetails(error: unknown): ErrorDetails {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      code: (error as any).code,
      type: (error as any).type || APIError.INTERNAL_ERROR
    };
  }
  return {
    message: String(error),
    type: APIError.INTERNAL_ERROR
  };
}

/**
 * Create standardized error response with request ID
 */
export function createErrorResponse(error: unknown, status: number = 500) {
  const requestId = uuidv4();
  const errorDetails = formatErrorDetails(error);
  
  logger.error(`[${requestId}] API Error:`, errorDetails);

  const response = {
    error: errorDetails.message,
    code: status,
    type: errorDetails.type || APIError.INTERNAL_ERROR,
    requestId,
    timestamp: new Date().toISOString()
  };

  // Validate response against schema
  const validatedResponse = ErrorResponseSchema.parse(response);

  return NextResponse.json(validatedResponse, { 
    status,
    headers: {
      ...SECURITY_HEADERS,
      'X-Request-ID': requestId
    }
  });
}

/**
 * Create standardized success response with request ID
 */
export function createSuccessResponse<T>(data: T, status: number = 200) {
  const requestId = uuidv4();
  
  const response = {
    data,
    requestId,
    timestamp: new Date().toISOString()
  };

  // Validate response against schema
  const validatedResponse = SuccessResponseSchema.parse(response);

  return NextResponse.json(validatedResponse, { 
    status,
    headers: {
      ...SECURITY_HEADERS,
      'X-Request-ID': requestId
    }
  });
}

/**
 * Validate required environment variables
 */
export function validateEnvVars(requiredVars: string[]): void {
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error('Missing required environment variables:', { missingVars });
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

/**
 * Validate required request body fields
 */
export function validateRequestBody(body: any, requiredFields: string[]): void {
  const missing = requiredFields.filter(field => !(field in body));
  
  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    (error as any).type = APIError.VALIDATION_ERROR;
    throw error;
  }
}

/**
 * Validate request body against a Zod schema
 */
export async function validateRequest<T>(
  req: NextRequest, 
  schema: z.ZodType<T>
): Promise<T> {
  try {
    const body = await req.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Request validation failed:', { 
        errors: error.errors 
      });
      throw new Error(error.errors.map(e => e.message).join(', '));
    }
    throw error;
  }
}

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  DEFAULT: {
    windowMs: 60 * 1000, // 1 minute
    max: 100 // limit each IP to 100 requests per windowMs
  },
  STRICT: {
    windowMs: 60 * 1000,
    max: 10
  }
}; 