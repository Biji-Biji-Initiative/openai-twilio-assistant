import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const response = NextResponse.next();
  
  // Allow all origins in development
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, Accept');
  response.headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
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