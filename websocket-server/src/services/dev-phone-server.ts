import express, { Request, Response, Router, RequestHandler, NextFunction } from "express";
import { ParamsDictionary } from 'express-serve-static-core';
import twilio from "twilio";
import dotenv from "dotenv";
import cors from "cors";

interface SimulateIncomingRequest {
  to: string;
}

interface UpdateCallRequest {
  muted: boolean;
}

interface CallResponse {
  success: boolean;
  sid: string;
}

interface ErrorResponse {
  error: string;
}

dotenv.config();

const app = express();
const router = Router();

// Global CORS middleware configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:1337',
  'http://localhost:8081',
  'https://mereka.ngrok.io',
  'http://mereka.ngrok.io',
  'https://mereka.ngrok.app',
  'http://mereka.ngrok.app',
  /\.ngrok\.io$/,
  /\.ngrok\.app$/,
  /^https?:\/\/[a-zA-Z0-9-]+\.ngrok-free\.app$/,
  /^https?:\/\/[a-zA-Z0-9-]+\.ngrok\.io$/,
  /^https?:\/\/[a-zA-Z0-9-]+\.ngrok\.app$/
];

const corsOptions = {
  origin: function(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
    console.log(`[CORS] Checking origin: ${origin}`);
    
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) {
      console.log('[CORS] Allowing request with no origin');
      callback(null, true);
      return;
    }

    // Always allow in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[CORS] Development mode - allowing origin: ${origin}`);
      callback(null, true);
      return;
    }

    // Check if the origin matches any of our allowed patterns
    const isAllowed = allowedOrigins.some(pattern => {
      const matches = typeof pattern === 'string' 
        ? pattern === origin 
        : pattern.test(origin);
      if (matches) {
        console.log(`[CORS] Origin ${origin} matched pattern ${pattern}`);
      }
      return matches;
    });

    if (isAllowed) {
      console.log(`[CORS] Allowing origin: ${origin}`);
      callback(null, true);
    } else {
      console.log(`[CORS] Rejected origin: ${origin}`);
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials'],
  exposedHeaders: ['Access-Control-Allow-Origin'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Add CORS headers for all responses
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  
  if (origin) {
    console.log(`[CORS Middleware] Processing request from origin: ${origin}`);
    
    const isAllowed = allowedOrigins.some(pattern => 
      typeof pattern === 'string' 
        ? pattern === origin 
        : pattern.test(origin)
    );

    if (isAllowed || process.env.NODE_ENV !== 'production') {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(', '));
      res.header('Access-Control-Expose-Headers', corsOptions.exposedHeaders.join(', '));
      res.header('Access-Control-Max-Age', corsOptions.maxAge.toString());
      
      // Handle WebSocket upgrade requests
      if (req.headers.upgrade === 'websocket') {
        console.log(`[WebSocket] Processing upgrade request from origin: ${origin}`);
        res.header('Access-Control-Allow-Headers', 'Upgrade, Connection, Sec-WebSocket-Key, Sec-WebSocket-Version');
      }
    } else {
      console.log(`[CORS Middleware] Rejected origin: ${origin}`);
    }
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID as string;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN as string;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER as string;
const PUBLIC_URL = process.env.PUBLIC_URL?.replace(/\/$/, "") as string;

// Log environment status
console.log("[DevPhone] Environment check:", {
  hasTwilioSid: !!TWILIO_ACCOUNT_SID,
  hasTwilioToken: !!TWILIO_AUTH_TOKEN,
  hasTwilioPhone: !!TWILIO_PHONE_NUMBER,
  hasPublicUrl: !!PUBLIC_URL
});

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
const VoiceResponse = twilio.twiml.VoiceResponse;

// Simulate incoming call
const simulateIncoming: RequestHandler = async (req, res) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      res.status(400).json({ error: "Missing 'to' parameter" });
      return;
    }

    const call = await twilioClient.calls.create({
      to,
      from: TWILIO_PHONE_NUMBER,
      url: `${process.env.PUBLIC_URL}/incoming-call`,
    });

    res.json({ success: true, sid: call.sid });
  } catch (error) {
    console.error("[Dev Phone] Error simulating incoming call:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
};

// Outbound call endpoint
const outboundCall: RequestHandler = async (req, res) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      res.status(400).json({ error: "Missing 'to' parameter" });
      return;
    }

    const call = await twilioClient.calls.create({
      to,
      from: TWILIO_PHONE_NUMBER,
      url: `${process.env.PUBLIC_URL}/outbound-call`,
    });

    res.json({ success: true, sid: call.sid });
  } catch (error) {
    console.error("[Dev Phone] Error making outbound call:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
};

// Update call status
const updateCall: RequestHandler = async (req, res) => {
  try {
    const { sid } = req.params;
    const { muted } = req.body;

    if (typeof muted !== 'boolean') {
      res.status(400).json({ error: "Missing or invalid 'muted' parameter" });
      return;
    }

    // Use type assertion to handle the muted property
    const call = await twilioClient.calls(sid).update({
      twiml: new twilio.twiml.VoiceResponse()
        .pause({ length: 1 })
        .toString()
    } as any);

    res.json({ success: true, sid: call.sid });
  } catch (error) {
    console.error("[Dev Phone] Error updating call:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
};

// Add health check endpoint with proper CORS handling
app.get("/health", cors(corsOptions), (req: Request, res: Response) => {
  try {
    // Set appropriate headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'application/json');
    
    // Log the health check request
    console.log(`[Dev Phone] Health check from ${req.ip}:`, {
      origin: req.headers.origin,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });

    const status = {
      status: 'ok',
      service: 'dev-phone',
      timestamp: new Date().toISOString(),
      environment: {
        mode: process.env.NODE_ENV || 'development',
        publicUrl: PUBLIC_URL || 'http://localhost:3001'
      },
      twilio: {
        hasTwilioSid: !!TWILIO_ACCOUNT_SID,
        hasTwilioToken: !!TWILIO_AUTH_TOKEN,
        hasTwilioPhone: !!TWILIO_PHONE_NUMBER,
        hasPublicUrl: !!PUBLIC_URL
      },
      server: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        port: port
      }
    };
    
    res.status(200).json(status);
  } catch (error) {
    console.error("[Dev Phone] Health check error:", error);
    
    // Set appropriate error headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Content-Type', 'application/json');
    
    res.status(500).json({ 
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Add OPTIONS handler for health check
app.options("/health", cors(corsOptions));

// Add a simple ping endpoint for basic connectivity checks
app.get("/ping", cors(corsOptions), (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("[Dev Phone] Error:", err);
  res.status(500).json({
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

router.post("/simulate-incoming", simulateIncoming);
router.post("/outbound-call", outboundCall);
router.post("/call/:sid/update", updateCall);

app.use(router);

const port = process.env.DEV_PHONE_PORT || 3001;

// Enhanced server startup
const startServer = () => {
  try {
    const server = app.listen(port, () => {
      console.log(`[Dev Phone] Server running on port ${port}`);
      console.log(`[Dev Phone] Health check available at http://localhost:${port}/health`);
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`[Dev Phone] Port ${port} is already in use`);
        process.exit(1);
      } else {
        console.error('[Dev Phone] Server error:', error);
        process.exit(1);
      }
    });

    // Handle process termination
    process.on('SIGTERM', () => {
      console.log('[Dev Phone] SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('[Dev Phone] Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('[Dev Phone] SIGINT received. Shutting down gracefully...');
      server.close(() => {
        console.log('[Dev Phone] Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('[Dev Phone] Error starting server:', error);
    process.exit(1);
  }
};

startServer(); 