interface ErrorDetails {
    message: string;
    name?: string;
    stack?: string;
    code?: string | number;
}
export declare function formatErrorDetails(error: Error | unknown): ErrorDetails;
export declare class WebSocketError extends Error {
    code: number;
    constructor(message: string, code?: number);
}
export declare class ConnectionError extends WebSocketError {
    constructor(message: string, code?: number);
}
export declare class MessageError extends WebSocketError {
    constructor(message: string, code?: number);
}
export {};
