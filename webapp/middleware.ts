import { NextResponse, NextRequest } from 'next/server';
import { logger } from '@/app/lib/logger';

type Environment = 'development' | 'production';

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',  // Frontend
  'http://localhost:8081',  // WebSocket Server
  'https://localhost:3000',
  'https://localhost:8081',
  // Add your production domains here
];

const allowedMethods = [
  'GET', 
  'POST', 
  'PUT', 
  'DELETE', 
  'OPTIONS', 
  'PATCH'
];

const allowedHeaders = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Origin',
  'Cache-Control',
  'Pragma'
];

const exposedHeaders = [
  'Content-Length',
  'Content-Type'
];

// Helper to check if origin is allowed
const isOriginAllowed = (origin: string | null, env: Environment): boolean => {
  if (env === 'development') return true;
  if (!origin) return true; // Allow requests with no origin
  return allowedOrigins.includes(origin);
};

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const env = (process.env.NODE_ENV || 'development') as Environment;

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': allowedMethods.join(', '),
        'Access-Control-Allow-Headers': allowedHeaders.join(', '),
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Expose-Headers': exposedHeaders.join(', ')
      }
    });
    return response;
  }

  // Handle actual requests
  if (isOriginAllowed(origin, env)) {
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
    response.headers.set('Access-Control-Allow-Methods', allowedMethods.join(', '));
    response.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Expose-Headers', exposedHeaders.join(', '));
    return response;
  }

  // Log and reject unauthorized requests
  logger.warn('Rejected CORS request:', { 
    origin,
    method: request.method,
    url: request.url
  });

  return new NextResponse(null, {
    status: 403,
    statusText: 'Forbidden'
  });
}

/**
 * Configure which routes middleware applies to
 */
export const config = {
  matcher: '/api/:path*'
}; 