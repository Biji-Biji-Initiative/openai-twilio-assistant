import { NextResponse } from 'next/server';
import { VoiceResponse } from 'twilio/lib/twiml/VoiceResponse';

export async function GET(request: Request) {
  const twiml = new VoiceResponse();
  
  // Start the conversation
  twiml.say({ voice: 'alice' }, 'Hello! I am your AI assistant. How can I help you today?');
  
  // Listen for user input
  twiml.gather({
    input: 'speech',
    action: '/api/call/response',
    method: 'POST',
    speechTimeout: 'auto',
    language: 'en-US'
  });

  return new NextResponse(twiml.toString(), {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}

export async function POST(request: Request) {
  // Handle POST the same way as GET for now
  return GET(request);
}
