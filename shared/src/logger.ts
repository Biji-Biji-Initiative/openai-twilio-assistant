import winston from 'winston';
import { z } from 'zod';

// Log level schema
const logLevelSchema = z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']);
type LogLevel = z.infer<typeof logLevelSchema>;

// Log context schema
export const logContextSchema = z.object({
  service: z.string().optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  requestId: z.string().optional(),
  signal: z.string().optional(),
  type: z.string().optional(),
  origin: z.string().optional(),
  port: z.number().optional(),
  publicUrl: z.string().optional(),
  environment: z.string().optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  duration: z.number().optional(),
  method: z.string().optional(),
  url: z.string().optional(),
  status: z.number().optional(),
  sessionCount: z.number().optional(),
  state: z.string().optional(),
  lastActivity: z.string().optional(),
  inactiveTime: z.number().optional(),
  totalConnections: z.number().optional(),
  stats: z.object({
    total: z.number(),
    connected: z.number(),
    connecting: z.number(),
    reconnecting: z.number(),
    disconnected: z.number(),
    failed: z.number()
  }).optional()
});

export type LogContext = z.infer<typeof logContextSchema>;

// Configure log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'twilio-app' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      dirname: process.env.LOG_DIR || 'logs'
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      dirname: process.env.LOG_DIR || 'logs'
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Type-safe logging functions
export const log = {
  error: (message: string, error?: Error, context?: LogContext) => {
    logger.error(message, {
      error: error?.stack || error,
      ...context
    });
  },
  
  warn: (message: string, context?: LogContext) => {
    logger.warn(message, context);
  },
  
  info: (message: string, context?: LogContext) => {
    logger.info(message, context);
  },
  
  debug: (message: string, context?: LogContext) => {
    logger.debug(message, context);
  },
  
  http: (message: string, context?: LogContext) => {
    logger.http(message, context);
  }
};

// Utility to set log level
export const setLogLevel = (level: LogLevel) => {
  try {
    const validatedLevel = logLevelSchema.parse(level);
    logger.level = validatedLevel;
  } catch (error) {
    logger.error('Invalid log level specified', { error, requestedLevel: level });
  }
};

// Express middleware for request logging
export const requestLogger = () => {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.http('HTTP Request', {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
    });
    
    next();
  };
};

// WebSocket logging utility
export const wsLogger = (sessionId: string) => ({
  info: (message: string, context?: Omit<LogContext, 'sessionId'>) => {
    logger.info(message, { ...context, sessionId });
  },
  error: (message: string, error?: Error, context?: Omit<LogContext, 'sessionId'>) => {
    logger.error(message, {
      error: error?.stack || error,
      ...context,
      sessionId
    });
  },
  debug: (message: string, context?: Omit<LogContext, 'sessionId'>) => {
    logger.debug(message, { ...context, sessionId });
  }
});

export default log; 