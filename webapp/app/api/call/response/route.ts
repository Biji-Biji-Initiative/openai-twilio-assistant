import { NextResponse } from 'next/server';
import { VoiceResponse } from 'twilio/lib/twiml/VoiceResponse';

export async function POST(request: Request) {
  const formData = await request.formData();
  const speechResult = formData.get('SpeechResult');
  
  console.log('Received speech:', speechResult);

  const twiml = new VoiceResponse();
  
  if (speechResult) {
    // Echo back what was heard
    twiml.say({ voice: 'alice' }, `I heard you say: ${speechResult}`);
    
    // Continue listening
    twiml.gather({
      input: 'speech',
      action: '/api/call/response',
      method: 'POST',
      speechTimeout: 'auto',
      language: 'en-US'
    });
  } else {
    twiml.say({ voice: 'alice' }, 'I did not hear anything. Please try again.');
    twiml.redirect('/api/call/twiml');
  }

  return new NextResponse(twiml.toString(), {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}
