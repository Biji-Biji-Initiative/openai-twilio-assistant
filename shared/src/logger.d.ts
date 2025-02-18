import { ErrorCode } from './error-handling';
export interface LogContext {
    service?: string;
    sessionId?: string;
    requestId?: string;
    userId?: string;
    [key: string]: unknown;
}
export interface LogEntry {
    level: string;
    message: string;
    timestamp: string;
    context?: LogContext;
    error?: {
        code?: ErrorCode;
        message: string;
        stack?: string;
    };
}
export declare class Logger {
    private options;
    private logger;
    constructor(options: {
        service: string;
        level?: string;
        filename?: string;
    });
    private formatMessage;
    debug(message: string, context?: LogContext): void;
    info(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext, error?: Error | unknown): void;
    error(message: string, context?: LogContext, error?: Error | unknown): void;
    child(context: LogContext): Logger;
}
export declare const loggers: {
    websocketServer: Logger;
    devPhone: Logger;
    webapp: Logger;
};
