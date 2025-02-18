import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { twilioService } from '../services/twilio-service';
import { sessionService } from '../services/session-service';
import WebSocket from 'ws';
import { AppError } from '../middleware/error-handler';

export async function handleOutboundCall(req: Request, res: Response) {
  try {
    const { to } = req.body;
    if (!to) {
      throw new AppError(400, 'Missing required parameter: to');
    }

    const call = await twilioService.makeOutboundCall(to);
    logger.info('Outbound call initiated:', { to, callSid: call.sid });
    res.json({ sid: call.sid });
  } catch (error) {
    logger.error('Error making outbound call:', error);
    throw error;
  }
}

export async function handleCallStatus(req: Request, res: Response) {
  try {
    const { CallSid, CallStatus, Duration } = req.body;
    logger.info('Call status update:', { CallSid, CallStatus, Duration });

    // Broadcast call status to all connected clients
    for (const session of sessionService.getAllSessions()) {
      if (session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
          type: 'call.status',
          callSid: CallSid,
          status: CallStatus,
          duration: Duration
        }));
      }
    }

    res.sendStatus(200);
  } catch (error) {
    logger.error('Error handling call status:', error);
    throw error;
  }
}

export async function handleTwiML(req: Request, res: Response) {
  try {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Hello! This is a test call from your Twilio application.</Say>
    <Play>https://demo.twilio.com/docs/classic.mp3</Play>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    logger.error('Error generating TwiML:', error);
    throw error;
  }
}

export async function handleTwilioCredentials(req: Request, res: Response) {
  try {
    const credentialsSet = await twilioService.verifyCredentials();
    res.json({ credentialsSet });
  } catch (error) {
    logger.error('Error checking Twilio credentials:', error);
    throw error;
  }
}

export async function handleTwilioNumbers(req: Request, res: Response) {
  try {
    const numbers = await twilioService.getPhoneNumbers();
    res.json(numbers);
  } catch (error) {
    logger.error('Error fetching Twilio numbers:', error);
    throw error;
  }
}

export async function handleUpdateWebhook(req: Request, res: Response) {
  try {
    const { phoneNumberSid, voiceUrl } = req.body;
    if (!phoneNumberSid || !voiceUrl) {
      throw new AppError(400, 'Missing required parameters: phoneNumberSid and voiceUrl');
    }

    const updatedNumber = await twilioService.updateWebhook(phoneNumberSid, voiceUrl);
    res.json(updatedNumber);
  } catch (error) {
    logger.error('Error updating webhook:', error);
    throw error;
  }
} 