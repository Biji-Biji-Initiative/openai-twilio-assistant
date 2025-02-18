import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler: ErrorRequestHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    logger.warn('Operational error:', { 
      statusCode: err.statusCode, 
      message: err.message,
      path: req.path
    });
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
    return;
  }

  // Unexpected errors
  logger.error('Unexpected error:', err);
  res.status(500).json({
    status: 'error',
    message: 'An unexpected error occurred'
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  next(new AppError(404, `Route ${req.path} not found`));
}; 