"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debug = exports.warn = exports.error = exports.info = exports.setFrontendConnection = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_transport_1 = __importDefault(require("winston-transport"));
const ws_1 = require("ws");
// Keep track of the frontend connection
let frontendConn = null;
const setFrontendConnection = (conn) => {
    frontendConn = conn;
};
exports.setFrontendConnection = setFrontendConnection;
// Custom WebSocket Transport
class WebSocketTransport extends winston_transport_1.default {
    constructor(opts) {
        super(opts);
    }
    log(info, callback) {
        setImmediate(() => {
            this.emit('logged', info);
        });
        // If a frontend connection exists, send the log message
        if (frontendConn && frontendConn.readyState === ws_1.WebSocket.OPEN) {
            frontendConn.send(JSON.stringify({
                type: 'log',
                message: info.message,
                level: info.level,
                timestamp: info.timestamp || new Date().toISOString(),
                ...info
            }));
        }
        callback();
    }
}
// Create the logger instance
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    defaultMeta: { service: 'twilio-openai-service' },
    transports: [
        // Console transport with custom format
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
                return `[${timestamp}] ${level}: ${message} ${metaStr}`;
            })),
        }),
        // File transport for persistent logging
        new winston_1.default.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: winston_1.default.format.json()
        }),
        new winston_1.default.transports.File({
            filename: 'logs/combined.log',
            format: winston_1.default.format.json()
        }),
        // WebSocket transport for real-time frontend updates
        new WebSocketTransport(),
    ],
});
// Create logs directory if it doesn't exist
const fs_1 = require("fs");
try {
    (0, fs_1.mkdirSync)('logs');
}
catch (error) {
    if (error.code !== 'EEXIST') {
        console.error('Error creating logs directory:', error);
    }
}
// Convenience methods for different log levels
const info = (message, meta = {}) => {
    logger.info(message, meta);
};
exports.info = info;
const error = (message, meta = {}) => {
    logger.error(message, meta);
};
exports.error = error;
const warn = (message, meta = {}) => {
    logger.warn(message, meta);
};
exports.warn = warn;
const debug = (message, meta = {}) => {
    logger.debug(message, meta);
};
exports.debug = debug;
// Export the logger instance for advanced usage
exports.default = logger;
//# sourceMappingURL=logger.js.map