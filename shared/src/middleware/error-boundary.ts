import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { log } from '../logger';
import type { LogContext } from '../logger';

// Define error types
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error response schema
const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
  requestId: z.string().optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

// Known error codes and their default messages
const ErrorCodes = {
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  BAD_REQUEST: 'BAD_REQUEST',
  CONFLICT: 'CONFLICT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// Map error codes to HTTP status codes
const statusCodeMap: Record<ErrorCode, number> = {
  [ErrorCodes.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.BAD_REQUEST]: 400,
  [ErrorCodes.CONFLICT]: 409,
  [ErrorCodes.TOO_MANY_REQUESTS]: 429,
  [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
};

// Helper to create error responses
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: any,
  requestId?: string
): ErrorResponse {
  return {
    error: {
      code,
      message,
      ...(details && { details }),
    },
    ...(requestId && { requestId }),
  };
}

// Error boundary middleware
export function errorBoundary() {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] as string;
    const logContext: LogContext = {
      requestId,
      type: 'error',
      method: req.method,
      url: req.url,
      status: res.statusCode,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };

    // Handle Zod validation errors
    if (err instanceof z.ZodError) {
      const response = createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Validation error',
        err.errors,
        requestId
      );
      
      log.warn('Validation error', {
        ...logContext,
        type: 'validation_error',
        status: 400
      });
      
      return res.status(400).json(response);
    }

    // Handle known application errors
    if (err instanceof AppError) {
      const response = createErrorResponse(
        err.code as ErrorCode,
        err.message,
        err.isOperational ? undefined : 'An unexpected error occurred',
        requestId
      );
      
      const statusCode = statusCodeMap[err.code as ErrorCode] || err.statusCode || 500;
      
      if (statusCode >= 500) {
        log.error('Application error', err, {
          ...logContext,
          type: 'application_error',
          status: statusCode
        });
      } else {
        log.warn('Application error', {
          ...logContext,
          type: 'application_error',
          status: statusCode
        });
      }
      
      return res.status(statusCode).json(response);
    }

    // Handle unknown errors
    const response = createErrorResponse(
      ErrorCodes.INTERNAL_SERVER_ERROR,
      'An unexpected error occurred',
      process.env.NODE_ENV === 'development' ? err.stack : undefined,
      requestId
    );
    
    log.error('Unhandled error', err, {
      ...logContext,
      type: 'unhandled_error',
      status: 500
    });
    
    return res.status(500).json(response);
  };
}

// Helper to wrap async route handlers
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Export error types and utilities
export { ErrorCodes }; 