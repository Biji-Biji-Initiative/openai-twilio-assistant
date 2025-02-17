import { NextResponse } from 'next/server';

export function createErrorResponse(message: string, status: number = 500) {
  return NextResponse.json(
    { 
      error: message,
      timestamp: new Date().toISOString(),
      code: status 
    }, 
    { status }
  );
} 