import { NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(request: Request) {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  // Get the transcription from the request
  const formData = await request.formData();
  const speechResult = formData.get('SpeechResult');

  if (speechResult) {
    // Echo back what was heard
    twiml.say(`I heard: ${speechResult}`);
  } else {
    twiml.say('I did not receive any speech input. Please try again.');
  }

  // Return TwiML response
  return new NextResponse(twiml.toString(), {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
} 