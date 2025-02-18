import winston from 'winston';
import path from 'path';

const logDir = 'logs';
const { combine, timestamp, printf, colorize } = winston.format;

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  [key: string]: any;
}

// Custom log format
const logFormat = printf(({ level, message, timestamp, ...metadata }: LogEntry) => {
  let msg = `${timestamp} [${level}] : ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(
        colorize(),
        logFormat
      )
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ],
  exitOnError: false
});

// Create a stream object for Morgan integration (if needed)
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

export default logger; 