import { NextRequest, NextResponse } from 'next/server';
import { allowedHeaders, allowedMethods, isOriginAllowed } from '@/lib/cors-config';

export function middleware(req: NextRequest) {
  const response = NextResponse.next();
  const origin = req.headers.get('origin');
  
  if (isOriginAllowed(origin || undefined)) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
    response.headers.set('Access-Control-Allow-Methods', allowedMethods.join(', '));
    response.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { 
      status: 200,
      headers: response.headers
    });
  }
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
}; 