import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { 
      publicUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
    }, 
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      },
    }
  );
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
} 