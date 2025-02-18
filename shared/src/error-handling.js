"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = exports.AppError = void 0;
exports.createErrorResponse = createErrorResponse;
exports.isAppError = isAppError;
exports.formatError = formatError;
class AppError extends Error {
    constructor(statusCode, message, isOperational = true, details) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.details = details;
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
exports.AppError = AppError;
var ErrorCode;
(function (ErrorCode) {
    // Authentication & Authorization
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCode["FORBIDDEN"] = "FORBIDDEN";
    ErrorCode["INVALID_CREDENTIALS"] = "INVALID_CREDENTIALS";
    // Input Validation
    ErrorCode["INVALID_INPUT"] = "INVALID_INPUT";
    ErrorCode["MISSING_REQUIRED_FIELD"] = "MISSING_REQUIRED_FIELD";
    // Resource Errors
    ErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ErrorCode["ALREADY_EXISTS"] = "ALREADY_EXISTS";
    ErrorCode["CONFLICT"] = "CONFLICT";
    // External Service Errors
    ErrorCode["TWILIO_ERROR"] = "TWILIO_ERROR";
    ErrorCode["OPENAI_ERROR"] = "OPENAI_ERROR";
    ErrorCode["EXTERNAL_SERVICE_ERROR"] = "EXTERNAL_SERVICE_ERROR";
    // WebSocket Errors
    ErrorCode["WEBSOCKET_CONNECTION_ERROR"] = "WEBSOCKET_CONNECTION_ERROR";
    ErrorCode["WEBSOCKET_MESSAGE_ERROR"] = "WEBSOCKET_MESSAGE_ERROR";
    // Rate Limiting
    ErrorCode["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    // Server Errors
    ErrorCode["INTERNAL_SERVER_ERROR"] = "INTERNAL_SERVER_ERROR";
    ErrorCode["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
function createErrorResponse(code, message, details) {
    return {
        status: 'error',
        code,
        message,
        details
    };
}
function isAppError(error) {
    return error instanceof AppError;
}
function formatError(error) {
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
