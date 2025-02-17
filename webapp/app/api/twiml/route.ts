import { NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(request: Request) {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  // Add basic voice response
  twiml.say('Hello! Your call has been connected. Please start speaking, and I will assist you.');

  // Return TwiML response
  return new NextResponse(twiml.toString(), {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
} 