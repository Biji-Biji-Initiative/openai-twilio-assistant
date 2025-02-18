import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler';
import { env } from '../config/environment';

// Rate limit configuration
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = env.NODE_ENV === 'development' ? 1000 : 100; // More permissive in development
const AUTH_MAX_REQUESTS = env.NODE_ENV === 'development' ? 100 : 5; // More permissive in development

export const apiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.',
  handler: (req, res, next) => {
    next(new AppError(429, 'Too many requests from this IP, please try again later.'));
  },
  headers: true, // Return rate limit info in headers
});

// More restrictive limiter for authentication endpoints
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: WINDOW_MS,
  max: AUTH_MAX_REQUESTS,
  message: 'Too many authentication attempts, please try again later.',
  handler: (req, res, next) => {
    next(new AppError(429, 'Too many authentication attempts, please try again later.'));
  },
  headers: true,
}); 