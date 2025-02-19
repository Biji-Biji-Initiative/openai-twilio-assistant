import { Request, Response, NextFunction } from 'express';
import { log } from '../logger';

export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const requestId = req.headers['x-request-id'] as string;
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      log.http('HTTP Request', {
        requestId,
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
}

// Export the request logger as the default middleware
export default requestLogger; 