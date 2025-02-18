"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggers = exports.Logger = void 0;
const winston_1 = __importDefault(require("winston"));
class Logger {
    constructor(options) {
        this.options = options;
        const transports = [
            new winston_1.default.transports.Console({
                format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
            })
        ];
        if (options.filename) {
            transports.push(new winston_1.default.transports.File({
                filename: options.filename,
                format: winston_1.default.format.json()
            }));
        }
        this.logger = winston_1.default.createLogger({
            level: options.level || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
            defaultMeta: {
                service: options.service
            },
            transports
        });
    }
    formatMessage(level, message, context, error) {
        const entry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            context: {
                service: this.options.service,
                ...context
            }
        };
        if (error) {
            if (error instanceof Error) {
                entry.error = {
                    message: error.message,
                    stack: error.stack
                };
            }
            else {
                entry.error = {
                    message: String(error)
                };
            }
        }
        return entry;
    }
    debug(message, context) {
        this.logger.debug(this.formatMessage('debug', message, context));
    }
    info(message, context) {
        this.logger.info(this.formatMessage('info', message, context));
    }
    warn(message, context, error) {
        this.logger.warn(this.formatMessage('warn', message, context, error));
    }
    error(message, context, error) {
        this.logger.error(this.formatMessage('error', message, context, error));
    }
    child(context) {
        return new Logger({
            ...this.options,
            service: `${this.options.service}:${context.service || 'child'}`
        });
    }
}
exports.Logger = Logger;
// Create default loggers for each service
exports.loggers = {
    websocketServer: new Logger({
        service: 'websocket-server',
        filename: 'logs/websocket-server.log'
    }),
    devPhone: new Logger({
        service: 'dev-phone',
        filename: 'logs/dev-phone.log'
    }),
    webapp: new Logger({
        service: 'webapp',
        filename: 'logs/webapp.log'
    })
};
