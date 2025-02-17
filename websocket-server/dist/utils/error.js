"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageError = exports.ConnectionError = exports.WebSocketError = void 0;
exports.formatErrorDetails = formatErrorDetails;
function formatErrorDetails(error) {
    if (error instanceof Error) {
        return {
            message: error.message,
            name: error.name,
            stack: error.stack,
            ...error.code && { code: error.code }
        };
    }
    return {
        message: String(error)
    };
}
class WebSocketError extends Error {
    constructor(message, code = 1011) {
        super(message);
        this.name = 'WebSocketError';
        this.code = code;
    }
}
exports.WebSocketError = WebSocketError;
class ConnectionError extends WebSocketError {
    constructor(message, code = 1006) {
        super(message, code);
        this.name = 'ConnectionError';
    }
}
exports.ConnectionError = ConnectionError;
class MessageError extends WebSocketError {
    constructor(message, code = 1007) {
        super(message, code);
        this.name = 'MessageError';
    }
}
exports.MessageError = MessageError;
//# sourceMappingURL=error.js.map