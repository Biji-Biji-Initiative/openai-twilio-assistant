import { Request, Response, NextFunction } from 'express';
interface RateLimitOptions {
    windowMs: number;
    maxRequests: number;
    message?: string;
    statusCode?: number;
    keyGenerator?: (req: Request) => string;
}
export declare class RateLimiter {
    private readonly options;
    private store;
    private cleanupInterval;
    private readonly defaultKeyGenerator;
    constructor(options: RateLimitOptions);
    middleware: (req: Request, res: Response, next: NextFunction) => void;
    private cleanup;
    dispose(): void;
}
export declare const rateLimiters: {
    api: RateLimiter;
    auth: RateLimiter;
    webhook: RateLimiter;
    websocket: RateLimiter;
};
export {};
