export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    details?: Record<string, unknown> | undefined;
    constructor(statusCode: number, message: string, isOperational?: boolean, details?: Record<string, unknown> | undefined);
    toJSON(): {
        status: string;
        statusCode: number;
        message: string;
        isOperational: boolean;
        details: Record<string, unknown> | undefined;
    };
}
export declare enum ErrorCode {
    UNAUTHORIZED = "UNAUTHORIZED",
    FORBIDDEN = "FORBIDDEN",
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
    INVALID_INPUT = "INVALID_INPUT",
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
    NOT_FOUND = "NOT_FOUND",
    ALREADY_EXISTS = "ALREADY_EXISTS",
    CONFLICT = "CONFLICT",
    TWILIO_ERROR = "TWILIO_ERROR",
    OPENAI_ERROR = "OPENAI_ERROR",
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
    WEBSOCKET_CONNECTION_ERROR = "WEBSOCKET_CONNECTION_ERROR",
    WEBSOCKET_MESSAGE_ERROR = "WEBSOCKET_MESSAGE_ERROR",
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
}
export interface ErrorResponse {
    status: 'error';
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
}
export declare function createErrorResponse(code: ErrorCode, message: string, details?: Record<string, unknown>): ErrorResponse;
export declare function isAppError(error: unknown): error is AppError;
export declare function formatError(error: unknown): ErrorResponse;
