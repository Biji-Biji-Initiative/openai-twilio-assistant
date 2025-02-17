import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '../utils/logger';
import { formatErrorDetails } from '../utils/error';
import functions from '../functionHandlers';

// Handle incoming HTTP requests
export const handleHttpRequest: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('[HTTP] Received request:', {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body
    });

    // Process request based on path
    switch (req.path) {
      case '/health':
      case '/api/health':
        handleHealthCheck(req, res);
        break;
      case '/tools':
      case '/api/tools':
        handleTools(req, res);
        break;
      case '/api/twilio':
        handleTwilioCredentials(req, res);
        break;
      case '/api/twilio/numbers':
        if (req.method === 'GET') {
          handleTwilioNumbers(req, res);
        } else if (req.method === 'POST') {
          handleUpdateWebhook(req, res);
        } else {
          res.status(405).json({
            error: 'Method Not Allowed',
            message: `Method ${req.method} not allowed for ${req.path}`
          });
        }
        break;
      default:
        res.status(404).json({ 
          error: 'Not Found',
          message: `Path ${req.path} not found`
        });
    }
  } catch (err) {
    next(err);
  }
};

// Health check endpoint
function handleHealthCheck(req: Request, res: Response) {
  const publicUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 8081}`;
  res.json({
    status: 'ok',
    publicUrl: publicUrl,
    service: 'websocket-server',
    environment: {
      mode: process.env.NODE_ENV || 'development',
      publicUrl: publicUrl
    },
    timestamp: new Date().toISOString()
  });
}

// Tools endpoint
function handleTools(req: Request, res: Response) {
  // Return the schemas of all available functions
  const toolSchemas = functions.map(fn => fn.schema);
  res.json(toolSchemas);
}

// Twilio credentials check endpoint
function handleTwilioCredentials(req: Request, res: Response) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  res.json({
    credentialsSet: !!(accountSid && authToken)
  });
}

// Twilio numbers endpoint
async function handleTwilioNumbers(req: Request, res: Response) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      res.status(400).json({
        error: 'Missing Credentials',
        message: 'Twilio credentials not configured'
      });
      return;
    }

    const client = require('twilio')(accountSid, authToken);
    const numbers = await client.incomingPhoneNumbers.list();
    
    res.json(numbers.map((num: { sid: string; phoneNumber: string; friendlyName: string; voiceUrl: string }) => ({
      sid: num.sid,
      phoneNumber: num.phoneNumber,
      friendlyName: num.friendlyName,
      voiceUrl: num.voiceUrl
    })));
  } catch (err) {
    const error = formatErrorDetails(err);
    logger.error('[Twilio] Error fetching phone numbers:', error);
    res.status(500).json({
      error: 'Failed to fetch phone numbers',
      message: error.message
    });
  }
}

// Update webhook endpoint
async function handleUpdateWebhook(req: Request, res: Response) {
  try {
    const { phoneNumberSid, voiceUrl } = req.body;
    
    if (!phoneNumberSid || !voiceUrl) {
      res.status(400).json({
        error: 'Missing Parameters',
        message: 'phoneNumberSid and voiceUrl are required'
      });
      return;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      res.status(400).json({
        error: 'Missing Credentials',
        message: 'Twilio credentials not configured'
      });
      return;
    }

    const client = require('twilio')(accountSid, authToken);
    const updatedNumber = await client.incomingPhoneNumbers(phoneNumberSid)
      .update({ voiceUrl });
    
    res.json({
      sid: updatedNumber.sid,
      phoneNumber: updatedNumber.phoneNumber,
      friendlyName: updatedNumber.friendlyName,
      voiceUrl: updatedNumber.voiceUrl
    });
  } catch (err) {
    const error = formatErrorDetails(err);
    logger.error('[Twilio] Error updating webhook:', error);
    res.status(500).json({
      error: 'Failed to update webhook',
      message: error.message
    });
  }
}

export default {
  handleHttpRequest
}; 