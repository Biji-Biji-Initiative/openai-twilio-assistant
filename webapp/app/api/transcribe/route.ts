import { NextRequest } from 'next/server';
import { createErrorResponse } from '../api-helpers';
import { logger } from '../../lib/logger';
import twilio from 'twilio';
import { TranscriptionRequestSchema } from '@/lib/validation-schemas';

export async function POST(req: NextRequest) {
  try {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    // Get the transcription from the request
    const formData = await req.formData();
    const validatedData = TranscriptionRequestSchema.parse({
      SpeechResult: formData.get('SpeechResult')
    });

    if (validatedData.SpeechResult) {
      // Echo back what was heard
      twiml.say(`I heard: ${validatedData.SpeechResult}`);
    } else {
      twiml.say('I did not receive any speech input. Please try again.');
    }

    logger.info('[Transcribe] Processing speech input:', {
      speechResult: validatedData.SpeechResult || 'No input received'
    });

    // Return TwiML response with correct content type
    return new Response(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml'
      }
    });
  } catch (error) {
    logger.error('[Transcribe] Error:', error);
    return createErrorResponse(error);
  }
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 