"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleHttpRequest = void 0;
const logger_1 = require("../utils/logger");
const functionHandlers_1 = __importDefault(require("../functionHandlers"));
// Handle incoming HTTP requests
const handleHttpRequest = (req, res, next) => {
    try {
        logger_1.logger.info('[HTTP] Received request:', {
            method: req.method,
            path: req.path,
            query: req.query,
            body: req.body
        });
        // Process request based on path
        switch (req.path) {
            case '/health':
                handleHealthCheck(req, res);
                break;
            case '/tools':
                handleTools(req, res);
                break;
            default:
                res.status(404).json({
                    error: 'Not Found',
                    message: `Path ${req.path} not found`
                });
        }
    }
    catch (err) {
        next(err);
    }
};
exports.handleHttpRequest = handleHttpRequest;
// Health check endpoint
function handleHealthCheck(req, res) {
    const publicUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 8081}`;
    res.json({
        status: 'ok',
        publicUrl: publicUrl,
        service: 'websocket-server',
        environment: {
            mode: process.env.NODE_ENV || 'development',
            publicUrl: publicUrl
        },
        timestamp: new Date().toISOString()
    });
}
// Tools endpoint
function handleTools(req, res) {
    // Return the schemas of all available functions
    const toolSchemas = functionHandlers_1.default.map(fn => fn.schema);
    res.json(toolSchemas);
}
exports.default = {
    handleHttpRequest: exports.handleHttpRequest
};
//# sourceMappingURL=http-handler.js.map