"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiters = exports.RateLimiter = void 0;
const error_handling_1 = require("./error-handling");
class RateLimiter {
    constructor(options) {
        this.options = options;
        this.store = {};
        this.defaultKeyGenerator = (req) => req.ip || 'unknown';
        this.middleware = (req, res, next) => {
            const key = this.options.keyGenerator(req);
            const now = Date.now();
            // Initialize or reset if window has expired
            if (!this.store[key] || now > this.store[key].resetTime) {
                this.store[key] = {
                    count: 0,
                    resetTime: now + this.options.windowMs
                };
            }
            // Increment request count
            this.store[key].count++;
            // Set rate limit headers
            const remaining = Math.max(0, this.options.maxRequests - this.store[key].count);
            const reset = Math.ceil((this.store[key].resetTime - now) / 1000);
            res.setHeader('X-RateLimit-Limit', this.options.maxRequests);
            res.setHeader('X-RateLimit-Remaining', remaining);
            res.setHeader('X-RateLimit-Reset', reset);
            // Check if limit exceeded
            if (this.store[key].count > this.options.maxRequests) {
                throw new error_handling_1.AppError(this.options.statusCode, this.options.message, true, {
                    code: error_handling_1.ErrorCode.RATE_LIMIT_EXCEEDED,
                    retryAfter: reset
                });
            }
            next();
        };
        this.options = {
            message: 'Too many requests, please try again later',
            statusCode: 429,
            keyGenerator: this.defaultKeyGenerator,
            ...options
        };
        // Clean up expired entries every minute
        this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
    }
    cleanup() {
        const now = Date.now();
        for (const key in this.store) {
            if (now > this.store[key].resetTime) {
                delete this.store[key];
            }
        }
    }
    dispose() {
        clearInterval(this.cleanupInterval);
        this.store = {};
    }
}
exports.RateLimiter = RateLimiter;
// Predefined rate limiters for common use cases
exports.rateLimiters = {
    // General API endpoints
    api: new RateLimiter({
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100,
        message: 'Too many API requests, please try again later'
    }),
    // Authentication endpoints
    auth: new RateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5,
        message: 'Too many authentication attempts, please try again later'
    }),
    // Twilio webhook endpoints
    webhook: new RateLimiter({
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 50,
        message: 'Too many webhook requests, please try again later'
    }),
    // WebSocket connections
    websocket: new RateLimiter({
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10,
        message: 'Too many WebSocket connection attempts, please try again later'
    })
};
