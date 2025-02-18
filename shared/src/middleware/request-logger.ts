import { Request, Response, NextFunction } from 'express';
import { loggers } from '../logger';

export const createRequestLogger = (serviceName: 'webapp' | 'devPhone' | 'websocketServer') => {
  const logger = loggers[serviceName];

  return (req: Request, res: Response, next: NextFunction) => {
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

export const createErrorLogger = (serviceName: 'webapp' | 'devPhone' | 'websocketServer') => {
  const logger = loggers[serviceName];

  return (err: Error, req: Request, res: Response, next: NextFunction) => {
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