import { NextRequest } from 'next/server';
import { handleCors, createErrorResponse, createSuccessResponse, validateEnvVars, validateRequestBody, APIError } from '../../api-helpers';
import { logger } from '../../../lib/logger';
import twilio from 'twilio';

const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN'
];

/**
 * Initialize Twilio client with validation
 */
function initializeTwilioClient() {
  validateEnvVars(requiredEnvVars);
  
  try {
    return twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
  } catch (error) {
    logger.error('[TwilioAPI] Failed to initialize client:', error);
    const initError = new Error('Failed to initialize Twilio client');
    (initError as any).type = APIError.TWILIO_ERROR;
    throw initError;
  }
}

/**
 * Get list of Twilio phone numbers
 */
export async function GET(req: NextRequest) {
  // Handle CORS
  const corsHeaders = handleCors(req);
  
  try {
    // Initialize client
    const client = initializeTwilioClient();
    
    logger.info('[TwilioAPI] Fetching phone numbers...');
    
    // Fetch phone numbers
    const numbers = await client.incomingPhoneNumbers.list({
      limit: 20
    });
    
    logger.info('[TwilioAPI] Found phone numbers:', { 
      count: numbers.length 
    });

    // Map response to include only necessary fields
    const response = numbers.map(number => ({
      sid: number.sid,
      phoneNumber: number.phoneNumber,
      friendlyName: number.friendlyName,
      capabilities: number.capabilities,
      voiceUrl: number.voiceUrl
    }));

    return createSuccessResponse(response);

  } catch (error) {
    logger.error('[TwilioAPI] Error fetching numbers:', error);
    return createErrorResponse(error);
  }
}

/**
 * Update Twilio phone number configuration
 */
export async function POST(req: NextRequest) {
  // Handle CORS
  const corsHeaders = handleCors(req);
  
  try {
    // Initialize client
    const client = initializeTwilioClient();

    // Parse and validate request body
    const body = await req.json();
    validateRequestBody(body, ['phoneNumberSid', 'voiceUrl']);

    logger.info('[TwilioAPI] Updating phone number:', { 
      sid: body.phoneNumberSid,
      voiceUrl: body.voiceUrl
    });

    // Update phone number
    const updatedNumber = await client.incomingPhoneNumbers(body.phoneNumberSid)
      .update({
        voiceUrl: body.voiceUrl,
        statusCallback: `${body.voiceUrl.replace(/\/twiml$/, '')}/status-callback`
      });

    logger.info('[TwilioAPI] Successfully updated phone number:', {
      sid: updatedNumber.sid,
      phoneNumber: updatedNumber.phoneNumber
    });

    return createSuccessResponse({
      sid: updatedNumber.sid,
      phoneNumber: updatedNumber.phoneNumber,
      friendlyName: updatedNumber.friendlyName,
      capabilities: updatedNumber.capabilities,
      voiceUrl: updatedNumber.voiceUrl
    });

  } catch (error) {
    logger.error('[TwilioAPI] Error updating number:', error);
    return createErrorResponse(error);
  }
}

/**
 * Handle OPTIONS request for CORS preflight
 */
export async function OPTIONS(req: NextRequest) {
  const corsHeaders = handleCors(req);
  if (corsHeaders instanceof Response) {
    return corsHeaders;
  }
  
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}
