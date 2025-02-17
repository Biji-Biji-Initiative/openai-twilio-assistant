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
      ...(error as any).code && { code: (error as any).code }
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

export class ConnectionError extends WebSocketError {
  constructor(message: string, code: number = 1006) {
    super(message, code);
    this.name = 'ConnectionError';
  }
}

export class MessageError extends WebSocketError {
  constructor(message: string, code: number = 1007) {
    super(message, code);
    this.name = 'MessageError';
  }
} 