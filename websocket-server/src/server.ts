import express from "express";
import { createServer } from "http";
import WebSocket from "ws";
import dotenv from "dotenv";
import cors from "cors";
import twilio from "twilio";
import { logger } from "./utils/logger";
import { setupWebSocketServer, currentLogs } from "./handlers/ws-handler";
import { handleHttpRequest } from "./handlers/http-handler";
import { isOriginAllowed, verifyWebSocketClient, generateStreamingTwiML, logCallDetails, formatErrorDetails } from "./utils";

dotenv.config();

const app = express();
const server = createServer(app);

// Global CORS middleware configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) {
      logger.info('[CORS] Allowing request with no origin');
      callback(null, true);
      return;
    }

    if (isOriginAllowed(origin)) {
      logger.info(`[CORS] Allowing origin: ${origin}`);
      callback(null, true);
    } else {
      logger.warn(`[CORS] Rejected origin: ${origin}`);
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Accept'],
  exposedHeaders: ['Content-Length', 'Content-Type']
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Add CORS headers for WebSocket upgrade requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize WebSocket server
const wss = new WebSocket.Server({ server });

// Environment variables
const PORT = process.env.PORT || 8081;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PUBLIC_URL = process.env.PUBLIC_URL?.replace(/\/$/, "") as string; // Remove trailing slash if present
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Log environment variables (excluding sensitive data)
logger.info('Environment variables:', {
  PORT,
  OPENAI_API_KEY: OPENAI_API_KEY ? '[SET]' : '[NOT SET]',
  TWILIO_ACCOUNT_SID: TWILIO_ACCOUNT_SID ? '[SET]' : '[NOT SET]',
  TWILIO_AUTH_TOKEN: TWILIO_AUTH_TOKEN ? '[SET]' : '[NOT SET]',
  TWILIO_PHONE_NUMBER: TWILIO_PHONE_NUMBER ? '[SET]' : '[NOT SET]'
});

// Only exit in production if variables are missing
if (process.env.NODE_ENV === 'production' && (!OPENAI_API_KEY || !PUBLIC_URL || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER)) {
  logger.error("[Server] Missing required environment variables in production");
  process.exit(1);
}

logger.info("[Server] Using PUBLIC_URL:", PUBLIC_URL || 'http://localhost:8081');

// Initialize Twilio client
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Setup WebSocket server with OpenAI integration
setupWebSocketServer(wss, OPENAI_API_KEY || '');

// Setup HTTP routes
app.use(handleHttpRequest);

// Inbound call handler
app.post("/incoming-call", (req: express.Request, res: express.Response) => {
  const callDetails = {
    from: req.body.From,
    to: req.body.To,
    callSid: req.body.CallSid,
    direction: 'inbound',
    timestamp: new Date().toISOString()
  };

  logCallDetails('IncomingCall', callDetails, 'Received inbound call');

  const twiml = generateStreamingTwiML(PUBLIC_URL, 'Connected');
  res.type('text/xml');
  res.send(twiml.toString());
});

// Status callback endpoint (shared between inbound and outbound calls)
app.post("/status-callback", (req: express.Request, res: express.Response) => {
  const {
    CallSid: callSid,
    CallStatus: callStatus,
    CallDuration: duration,
    ErrorCode: errorCode,
    ErrorMessage: errorMessage,
    SequenceNumber: sequence,
    Direction: direction,
    CallbackSource: source,
    Timestamp: eventTimestamp,
  } = req.body;

  const statusDetails = {
    callSid,
    callStatus,
    duration: duration || 0,
    sequence,
    direction,
    source,
    eventTimestamp,
    ...(errorCode && { errorCode, errorMessage })
  };

  logCallDetails('StatusCallback', statusDetails, 'Call status update received');

  // Forward status updates to the frontend if logs connection exists
  if (currentLogs?.readyState === WebSocket.OPEN) {
    try {
      currentLogs.send(JSON.stringify({
        type: "call.status",
        ...statusDetails,
        timestamp: new Date().toISOString(),
      }));
      logger.debug('[StatusCallback] Forwarded status to frontend');
    } catch (err) {
      const error = formatErrorDetails(err);
      logger.error('[StatusCallback] Error forwarding status to frontend:', error);

      // Try to notify frontend about the error
      try {
        currentLogs.send(JSON.stringify({
          type: "error",
          error: "Failed to forward call status",
          details: error.message,
          timestamp: new Date().toISOString(),
        }));
      } catch (sendError) {
        logger.error('[StatusCallback] Failed to send error notification:', formatErrorDetails(sendError));
      }
    }
  } else {
    logger.warn('[StatusCallback] No active logs connection to forward status');
  }

  res.sendStatus(200);
});

// Add health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'websocket-server',
    environment: {
      publicUrl: process.env.PUBLIC_URL || 'http://localhost:8081',
      mode: process.env.NODE_ENV || 'development'
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const error = formatErrorDetails(err);
  logger.error('[Server] Unhandled error:', error);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message
  });
});

// Start server
server.listen(PORT, () => {
  const publicUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Public URL: ${publicUrl}`);
  logger.info(`WebSocket endpoints:`);
  logger.info(`- Call: ${publicUrl}/call`);
  logger.info(`- Logs: ${publicUrl}/logs`);
});
