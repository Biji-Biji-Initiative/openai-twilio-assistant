import { Router } from 'express';
import { handleOutboundCall, handleCallStatus, handleTwiML, handleTwilioCredentials, handleTwilioNumbers, handleUpdateWebhook } from '../handlers/request-handler';
import { env } from '../config/environment';
import { validateRequest } from '../middleware/validation';
import { apiLimiter, authLimiter } from '../middleware/rate-limit';
import { outboundCallSchema, callStatusSchema, updateWebhookSchema } from '../types/api';
import { API_ROUTES } from '../constants';

const router = Router();

// Health check (no rate limit)
router.get(API_ROUTES.HEALTH, (req, res) => {
  res.json({
    status: 'ok',
    service: 'websocket-server',
    environment: {
      publicUrl: env.PUBLIC_URL,
      nodeEnv: env.NODE_ENV
    }
  });
});

// Call endpoints (with rate limiting and validation)
router.post(
  API_ROUTES.OUTBOUND_CALL,
  apiLimiter as any,
  validateRequest(outboundCallSchema),
  handleOutboundCall
);

router.post(
  API_ROUTES.CALL_STATUS,
  validateRequest(callStatusSchema),
  handleCallStatus
);

router.get(API_ROUTES.TWIML, handleTwiML);

// Twilio configuration endpoints (with stricter rate limiting)
router.get(
  API_ROUTES.TWILIO_CREDENTIALS,
  authLimiter as any,
  handleTwilioCredentials
);

router.get(
  API_ROUTES.TWILIO_NUMBERS,
  authLimiter as any,
  handleTwilioNumbers
);

router.post(
  API_ROUTES.TWILIO_NUMBERS,
  authLimiter as any,
  validateRequest(updateWebhookSchema),
  handleUpdateWebhook
);

export default router; 