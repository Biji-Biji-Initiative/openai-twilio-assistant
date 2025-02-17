import { NextRequest } from 'next/server';
import { handleCors, createErrorResponse, createSuccessResponse, validateRequestBody } from '../api-helpers';
import { logger } from '../../lib/logger';
import twilio from 'twilio';
import VoiceResponse from 'twilio/lib/twiml/VoiceResponse';

export async function POST(req: NextRequest) {
  // Handle CORS
  const corsHeaders = handleCors(req);
  
  try {
    // Parse request body
    const body = await req.json();
    
    // Validate request body
    validateRequestBody(body, ['callType']);

    // Create TwiML response
    const twiml = new twilio.twiml.VoiceResponse();

    switch (body.callType) {
      case 'stream':
        if (!body.publicUrl) {
          throw new Error('Missing publicUrl for streaming TwiML');
        }
        
        if (body.greeting) {
          twiml.say(body.greeting);
        }

        twiml.connect().stream({
          url: `${body.publicUrl}/call`,
          statusCallback: `${body.publicUrl}/status-callback`,
          statusCallbackMethod: 'POST'
        });

        twiml.say('Disconnected');
        break;

      case 'gather':
        twiml.gather({
          input: 'speech dtmf',
          timeout: 3,
          numDigits: 1
        }).say('Please press any key or speak to begin.');
        break;

      default:
        throw new Error(`Unsupported call type: ${body.callType}`);
    }

    logger.info('[TwiML] Generated response:', { 
      callType: body.callType,
      twiml: twiml.toString()
    });

    // Return TwiML response with correct content type
    return new Response(twiml.toString(), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml'
      }
    });

  } catch (error) {
    logger.error('[TwiML] Error:', error);
    return createErrorResponse(error);
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