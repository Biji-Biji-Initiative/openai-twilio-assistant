export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true,
    public details?: Record<string, unknown>
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      status: 'error',
      statusCode: this.statusCode,
      message: this.message,
      isOperational: this.isOperational,
      details: this.details
    };
  }
}

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // Input Validation
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resource Errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  
  // External Service Errors
  TWILIO_ERROR = 'TWILIO_ERROR',
  OPENAI_ERROR = 'OPENAI_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // WebSocket Errors
  WEBSOCKET_CONNECTION_ERROR = 'WEBSOCKET_CONNECTION_ERROR',
  WEBSOCKET_MESSAGE_ERROR = 'WEBSOCKET_MESSAGE_ERROR',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

export interface ErrorResponse {
  status: 'error';
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): ErrorResponse {
  return {
    status: 'error',
    code,
    message,
    details
  };
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function formatError(error: unknown): ErrorResponse {
  if (isAppError(error)) {
    return {
      status: 'error',
      code: error.statusCode === 404 ? ErrorCode.NOT_FOUND : ErrorCode.INTERNAL_SERVER_ERROR,
      message: error.message,
      details: error.details
    };
  }

  if (error instanceof Error) {
    return {
      status: 'error',
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: error.message,
      details: { stack: error.stack }
    };
  }

  return {
    status: 'error',
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    message: 'An unexpected error occurred',
    details: { error }
  };
} 