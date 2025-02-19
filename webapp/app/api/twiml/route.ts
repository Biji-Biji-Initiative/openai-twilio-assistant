import { NextRequest } from 'next/server';
import { createErrorResponse, validateRequest } from '../api-helpers';
import { logger } from '@/app/lib/logger';
import twilio from 'twilio';
import VoiceResponse from 'twilio/lib/twiml/VoiceResponse';
import { TwiMLRequestSchema } from '@/lib/validation-schemas';

export async function POST(req: NextRequest) {
  try {
    // Validate request body using Zod schema
    const validatedBody = await validateRequest(req, TwiMLRequestSchema);

    // Create TwiML response
    const twiml = new twilio.twiml.VoiceResponse();

    switch (validatedBody.callType) {
      case 'stream':
        if (!validatedBody.publicUrl) {
          throw new Error('Missing publicUrl for streaming TwiML');
        }
        
        if (validatedBody.greeting) {
          twiml.say(validatedBody.greeting);
        }

        twiml.connect().stream({
          url: `${validatedBody.publicUrl}/call`,
          statusCallback: `${validatedBody.publicUrl}/status-callback`,
          statusCallbackMethod: 'POST'
        });

        twiml.say('Disconnected');
        break;

      case 'gather':
        twiml.gather({
          input: ['speech', 'dtmf'],
          timeout: 3,
          numDigits: 1
        }).say('Please press any key or speak to begin.');
        break;

      default:
        throw new Error(`Unsupported call type: ${validatedBody.callType}`);
    }

    logger.info('[TwiML] Generated response:', { 
      callType: validatedBody.callType,
      twiml: twiml.toString()
    });

    // Return TwiML response with correct content type
    return new Response(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml'
      }
    });

  } catch (error) {
    logger.error('[TwiML] Error:', error);
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const callSid = searchParams.get('callSid');

    logger.info('[TwiML] Generating TwiML for call:', { callSid });

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Hello! This is a test call from your Twilio application.');

    return new Response(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    logger.error('[TwiML] Error:', error);
    return createErrorResponse(error);
  }
} 