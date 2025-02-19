import { Router } from 'express';
import { handleOutboundCall, handleCallStatus, handleTwiML, handleTwilioCredentials, handleTwilioNumbers, handleUpdateWebhook } from '../handlers/request-handler';
import { env } from '../config/environment';
import { validateRequest } from '../middleware/validation';
import { outboundCallSchema, callStatusSchema, updateWebhookSchema } from '../types/api';
import { API_ROUTES } from '../constants';

const router = Router();

// Health check
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

// Call endpoints (with validation)
router.post(
  API_ROUTES.OUTBOUND_CALL,
  validateRequest(outboundCallSchema),
  handleOutboundCall
);

router.post(
  API_ROUTES.CALL_STATUS,
  validateRequest(callStatusSchema),
  handleCallStatus
);

router.get(API_ROUTES.TWIML, handleTwiML);

// Twilio configuration endpoints
router.get(
  API_ROUTES.TWILIO_CREDENTIALS,
  handleTwilioCredentials
);

router.get(
  API_ROUTES.TWILIO_NUMBERS,
  handleTwilioNumbers
);

router.post(
  API_ROUTES.TWILIO_NUMBERS,
  validateRequest(updateWebhookSchema),
  handleUpdateWebhook
);

export default router; 