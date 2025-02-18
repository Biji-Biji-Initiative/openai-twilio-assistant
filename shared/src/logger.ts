import winston from 'winston';
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

export class Logger {
  private logger: winston.Logger;

  constructor(
    private options: {
      service: string;
      level?: string;
      filename?: string;
    }
  ) {
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ];

    if (options.filename) {
      transports.push(
        new winston.transports.File({
          filename: options.filename,
          format: winston.format.json()
        })
      );
    }

    this.logger = winston.createLogger({
      level: options.level || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: {
        service: options.service
      },
      transports
    });
  }

  private formatMessage(level: string, message: string, context?: LogContext, error?: Error | unknown): LogEntry {
    const entry: LogEntry = {
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
      } else {
        entry.error = {
          message: String(error)
        };
      }
    }

    return entry;
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(this.formatMessage('debug', message, context));
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext, error?: Error | unknown): void {
    this.logger.warn(this.formatMessage('warn', message, context, error));
  }

  error(message: string, context?: LogContext, error?: Error | unknown): void {
    this.logger.error(this.formatMessage('error', message, context, error));
  }

  child(context: LogContext): Logger {
    return new Logger({
      ...this.options,
      service: `${this.options.service}:${context.service || 'child'}`
    });
  }
}

// Create default loggers for each service
export const loggers = {
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