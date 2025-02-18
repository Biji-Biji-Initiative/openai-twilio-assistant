"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createErrorLogger = exports.createRequestLogger = void 0;
const logger_1 = require("../logger");
const createRequestLogger = (serviceName) => {
    const logger = logger_1.loggers[serviceName];
    return (req, res, next) => {
        const startTime = Date.now();
        const requestId = Math.random().toString(36).substring(2, 15);
        // Log request start
        logger.info('Request started', {
            requestId,
            method: req.method,
            url: req.url,
            query: req.query,
            headers: req.headers
        });
        // Log response using response events
        res.on('finish', () => {
            const responseTime = Date.now() - startTime;
            logger.info('Request completed', {
                requestId,
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                responseTime
            });
        });
        next();
    };
};
exports.createRequestLogger = createRequestLogger;
const createErrorLogger = (serviceName) => {
    const logger = logger_1.loggers[serviceName];
    return (err, req, res, next) => {
        logger.error('Request error', {
            method: req.method,
            url: req.url,
            error: {
                message: err.message,
                stack: err.stack
            }
        });
        next(err);
    };
};
exports.createErrorLogger = createErrorLogger;
