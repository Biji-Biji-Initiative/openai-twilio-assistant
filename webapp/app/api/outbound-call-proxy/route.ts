import { NextRequest } from 'next/server';
import { handleCors, createErrorResponse, createSuccessResponse, validateRequestBody, validateEnvVars } from '../api-helpers';
import { logger } from '../../lib/logger';
import twilio from 'twilio';

const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'NEXT_PUBLIC_BACKEND_URL'
];

export async function POST(req: NextRequest) {
  // Handle CORS
  const corsHeaders = handleCors(req);
  
  try {
    // Validate environment variables
    validateEnvVars(requiredEnvVars);
    
    // Parse request body
    const body = await req.json();
    
    // Validate request body
    validateRequestBody(body, ['phoneNumber']);
    
    // Initialize Twilio client
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    // Make the outbound call
    const call = await client.calls.create({
      to: body.phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER!,
      url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/twiml`,
      statusCallback: `${process.env.NEXT_PUBLIC_BACKEND_URL}/status-callback`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });

    logger.info('[OutboundCallProxy] Call initiated:', { 
      callSid: call.sid,
      to: body.phoneNumber,
      status: call.status 
    });

    return createSuccessResponse({ 
      callSid: call.sid,
      status: call.status
    }, 201);

  } catch (error) {
    logger.error('[OutboundCallProxy] Error:', error);
    return createErrorResponse(error);
  }
} 