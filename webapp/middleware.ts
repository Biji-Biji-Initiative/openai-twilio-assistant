import { NextResponse, NextRequest } from 'next/server';
import { corsOptions, allowedMethods, allowedHeaders, exposedHeaders } from 'shared/lib/cors-config';
import { logger } from './lib/logger';

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
export function middleware(req: NextRequest) {
  const env = (process.env.NODE_ENV || 'development') as Environment;
  const origin = req.headers.get('origin');
  const headers = new Headers();

  if (isOriginAllowed(origin, env)) {
    headers.set('Access-Control-Allow-Origin', origin!);
    headers.set('Vary', 'Origin');
    logger.debug(`[CORS] Allowing origin: ${origin}`);
  } else {
    logger.warn(`[CORS] Rejected origin: ${origin}`);
  }

  // Security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });

  // CORS headers
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Allow-Methods', allowedMethods.join(','));
  headers.set('Access-Control-Allow-Headers', allowedHeaders.join(','));
  headers.set('Access-Control-Expose-Headers', exposedHeaders.join(','));

  // Add HSTS in production
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // For preflight requests
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers });
  }

  return NextResponse.next({ headers });
}

/**
 * Configure which routes middleware applies to
 */
export const config = {
  matcher: '/api/:path*'
}; 