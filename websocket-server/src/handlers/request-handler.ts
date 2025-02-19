import { Request, Response } from 'express';
import { log, LogContext } from '@twilio/shared';
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
    const logContext: LogContext = {
      type: 'call.outbound',
      phoneNumber: to,
      callSid: call.sid
    };
    log.info('Outbound call initiated', logContext);
    res.json({ sid: call.sid });
  } catch (error) {
    const errorContext: LogContext = {
      type: 'call.error',
      phoneNumber: req.body.to
    };
    log.error('Error making outbound call', error instanceof Error ? error : new Error(String(error)), errorContext);
    throw error;
  }
}

export async function handleCallStatus(req: Request, res: Response) {
  try {
    const { CallSid, CallStatus, Duration } = req.body;
    const logContext: LogContext = {
      type: 'call.status',
      callSid: CallSid,
      callStatus: CallStatus,
      callDuration: Duration
    };
    log.info('Call status update', logContext);

    // Broadcast call status to all connected clients
    const sessions = sessionService.getAllSessions();
    for (const [sessionId, ws] of sessions.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({
            type: 'call.status',
            callSid: CallSid,
            status: CallStatus,
            duration: Duration
          }));
        } catch (error) {
          const errorContext: LogContext = {
            type: 'call.error',
            sessionId,
            callSid: CallSid,
            callStatus: CallStatus
          };
          log.error('Error sending call status to client', error instanceof Error ? error : new Error(String(error)), errorContext);
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    const errorContext: LogContext = {
      type: 'call.error'
    };
    log.error('Error handling call status', error instanceof Error ? error : new Error(String(error)), errorContext);
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
    log.error('Error generating TwiML', error instanceof Error ? error : new Error(String(error)), {
      type: 'twiml.error'
    });
    throw error;
  }
}

export async function handleTwilioCredentials(req: Request, res: Response) {
  try {
    const credentialsSet = await twilioService.verifyCredentials();
    res.json({ credentialsSet });
  } catch (error) {
    log.error('Error checking Twilio credentials', error instanceof Error ? error : new Error(String(error)), {
      type: 'twilio.error'
    });
    throw error;
  }
}

export async function handleTwilioNumbers(req: Request, res: Response) {
  try {
    const numbers = await twilioService.getPhoneNumbers();
    res.json(numbers);
  } catch (error) {
    log.error('Error fetching Twilio numbers', error instanceof Error ? error : new Error(String(error)), {
      type: 'twilio.error'
    });
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
    log.error('Error updating webhook', error instanceof Error ? error : new Error(String(error)), {
      type: 'twilio.error'
    });
    throw error;
  }
} 