import { NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(request: Request) {
  try {
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

    // Return TwiML response with CORS headers
    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      },
    });
  } catch (error) {
    console.error('Error in transcribe endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process transcription' },
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