import { NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(request: Request) {
  try {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    // Add basic voice response
    twiml.say('Hello! Your call has been connected. Please start speaking, and I will assist you.');

    // Return TwiML response with CORS headers
    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      },
    });
  } catch (error) {
    console.error('Error in TwiML endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to generate TwiML response' },
      { status: 500 }
    );
  }
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