// WebSocket Configuration
export const WS_ENDPOINTS = {
  CALL: '/call',
  LOGS: '/logs'
} as const;

// Session Management
export const SESSION = {
  CLEANUP_INTERVAL_MS: 30000,
  INACTIVE_THRESHOLD_MS: 60000
} as const;

// Call Status Types
export const CALL_STATUS = {
  INITIATING: 'initiating',
  RINGING: 'ringing',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  BUSY: 'busy',
  NO_ANSWER: 'no-answer',
  CANCELED: 'canceled'
} as const;

// Message Types
export const MESSAGE_TYPE = {
  CALL_STATUS: 'call.status',
  CALL_ACTION: 'call.action',
  ERROR: 'error'
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500
} as const;

// CORS Configuration
export const ALLOWED_ORIGINS = [
  'http://localhost',
  'https://localhost',
  'http://127.0.0.1',
  'https://127.0.0.1'
] as const;

// API Routes
export const API_ROUTES = {
  HEALTH: '/health',
  OUTBOUND_CALL: '/outbound-call',
  CALL_STATUS: '/call-status',
  TWIML: '/twiml/outbound-call',
  TWILIO_CREDENTIALS: '/twilio',
  TWILIO_NUMBERS: '/twilio/numbers'
} as const; 