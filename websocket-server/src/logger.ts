import winston from 'winston';
import Transport from 'winston-transport';
import { WebSocket } from 'ws';

// Keep track of the frontend connection
let frontendConn: WebSocket | null = null;

export const setFrontendConnection = (conn: WebSocket | null) => {
  frontendConn = conn;
};

// Custom WebSocket Transport
class WebSocketTransport extends Transport {
  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts);
  }

  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // If a frontend connection exists, send the log message
    if (frontendConn && frontendConn.readyState === WebSocket.OPEN) {
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
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'twilio-openai-service' },
  transports: [
    // Console transport with custom format
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `[${timestamp}] ${level}: ${message} ${metaStr}`;
        })
      ),
    }),
    // File transport for persistent logging
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      format: winston.format.json()
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      format: winston.format.json()
    }),
    // WebSocket transport for real-time frontend updates
    new WebSocketTransport(),
  ],
});

// Create logs directory if it doesn't exist
import { mkdirSync } from 'fs';
try {
  mkdirSync('logs');
} catch (error) {
  if ((error as any).code !== 'EEXIST') {
    console.error('Error creating logs directory:', error);
  }
}

// Convenience methods for different log levels
export const info = (message: string, meta: object = {}) => {
  logger.info(message, meta);
};

export const error = (message: string, meta: object = {}) => {
  logger.error(message, meta);
};

export const warn = (message: string, meta: object = {}) => {
  logger.warn(message, meta);
};

export const debug = (message: string, meta: object = {}) => {
  logger.debug(message, meta);
};

// Export the logger instance for advanced usage
export default logger; 