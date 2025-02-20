import { NextResponse } from 'next/server';
import twilio from 'twilio';

export async function GET(request: Request) {
  const wsUrl = 'wss://mereka.ngrok.io';
  
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say('Connected');
  twiml.connect().stream({ url: `${wsUrl}/call` });
  twiml.say('Disconnected');

  return new NextResponse(twiml.toString(), {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}
