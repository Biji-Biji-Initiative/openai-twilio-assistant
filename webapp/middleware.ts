import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger } from './app/lib/logger';

type Environment = 'development' | 'production';

/**
 * CORS configuration based on environment
 */
const ALLOWED_ORIGINS: Record<Environment, (string | RegExp)[]> = {
  development: [
    'http://localhost:3000',
    'http://localhost:8081',
    /^https?:\/\/[a-zA-Z0-9-]+\.ngrok\.io$/,
    /^https?:\/\/[a-zA-Z0-9-]+\.ngrok-free\.app$/
  ],
  production: [
    'https://mereka.ngrok.io'
  ]
};

/**
 * Security headers for all responses
 */
const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

/**
 * CORS headers configuration
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, Accept',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Type, X-Request-ID'
};

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string | null, env: Environment): boolean {
  if (!origin) {
    return env === 'development';
  }

  return ALLOWED_ORIGINS[env].some(allowed => {
    if (allowed instanceof RegExp) {
      return allowed.test(origin);
    }
    return allowed === origin;
  });
}

/**
 * Middleware configuration
 */
export function middleware(request: NextRequest) {
  const env = (process.env.NODE_ENV || 'development') as Environment;
  const origin = request.headers.get('origin');
  
  // Create base response or get the response to modify
  const response = NextResponse.next();
  
  // Add security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Handle CORS
  if (isOriginAllowed(origin, env)) {
    // Set CORS headers
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    // Set allowed origin
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      logger.debug(`[CORS] Allowing origin: ${origin}`);
    }
  } else {
    logger.warn(`[CORS] Rejected origin: ${origin}`);
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { 
      status: 204,
      headers: response.headers
    });
  }

  return response;
}

/**
 * Configure which routes middleware applies to
 */
export const config = {
  matcher: '/api/:path*'
}; 