import { NextRequest } from 'next/server';
import { createErrorResponse, createSuccessResponse, validateRequest, validateEnvVars } from '../api-helpers';
import { logger } from '../../lib/logger';
import twilio from 'twilio';
import { OutboundCallSchema } from '@/lib/validation-schemas';

const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'NEXT_PUBLIC_BACKEND_URL'
];

export async function POST(req: NextRequest) {
  try {
    // Validate environment variables
    validateEnvVars(requiredEnvVars);
    
    // Validate request body using Zod schema
    const validatedBody = await validateRequest(req, OutboundCallSchema);
    
    // Initialize Twilio client
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    // Make the outbound call
    const call = await client.calls.create({
      to: validatedBody.phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER!,
      url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/twiml`,
      statusCallback: `${process.env.NEXT_PUBLIC_BACKEND_URL}/status-callback`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });

    logger.info('[OutboundCallProxy] Call initiated:', { 
      callSid: call.sid,
      to: validatedBody.phoneNumber,
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