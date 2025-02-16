import express, { Request, Response, NextFunction } from "express";
import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import dotenv from "dotenv";
import http from "http";
import { readFileSync } from "fs";
import { join } from "path";
import cors from "cors";
import twilio from "twilio";
import {
  handleCallConnection,
  handleFrontendConnection,
} from "./sessionManager";
import functions from "./functionHandlers";

dotenv.config();

const app = express();

// Global CORS middleware configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'https://mereka.ngrok.io', 'https://mereka.au.ngrok.io'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Remove the redundant CORS middleware and use express.Router() instead
const router = express.Router();
app.use(router);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const server = http.createServer(app);

// Configure WebSocket server with proper headers
const wss = new WebSocketServer({ 
  server,
  clientTracking: true,
  perMessageDeflate: false, // Disable compression for better stability
  verifyClient: (info: { origin: string; secure: boolean; req: IncomingMessage }) => {
    const origin = info.origin || info.req.headers.origin || '';
    const isAllowed = corsOptions.origin.includes(origin);
    return isAllowed;
  }
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string;
const PUBLIC_URL = process.env.PUBLIC_URL?.replace(/\/$/, "") as string; // Remove trailing slash if present
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID as string;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN as string;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER as string;

// Log environment status
console.log("[Server] Environment check:", {
  hasOpenAIKey: !!OPENAI_API_KEY,
  hasPublicUrl: !!PUBLIC_URL,
  hasTwilioSid: !!TWILIO_ACCOUNT_SID,
  hasTwilioToken: !!TWILIO_AUTH_TOKEN,
  hasTwilioPhone: !!TWILIO_PHONE_NUMBER
});

// Only exit in production if variables are missing
if (process.env.NODE_ENV === 'production' && (!OPENAI_API_KEY || !PUBLIC_URL || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER)) {
  console.error("[Server] Missing required environment variables in production");
  process.exit(1);
}

console.log("[Server] Using PUBLIC_URL:", PUBLIC_URL || 'http://localhost:8081');

const VoiceResponse = twilio.twiml.VoiceResponse;
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Helper function to generate TwiML for both inbound and outbound calls
function generateStreamingTwiML(greeting?: string) {
  const twiml = new VoiceResponse();
  
  // Add optional greeting for inbound calls
  if (greeting) {
    console.log("[TwiML] Adding greeting:", greeting);
    twiml.say(greeting);
  }
  
  // Set up the streaming connection
  const wsUrl = new URL(PUBLIC_URL);
  wsUrl.protocol = "wss:";
  wsUrl.pathname = "/call";
  
  console.log("[TwiML] Setting up WebSocket URL:", wsUrl.toString());
  
  // Create the stream connection with status callbacks
  const connect = twiml.connect();
  const stream = connect.stream({
    url: wsUrl.toString(),
    // Note: These are actually supported by Twilio but not typed correctly in the SDK
    statusCallback: `${PUBLIC_URL}/status-callback`,
    statusCallbackMethod: "POST",
  });

  // Add status callback events using the underlying Twilio XML
  // This is a workaround for the TypeScript type limitation
  (stream as any).node.setAttribute('statusCallbackEvent', 'initiated ringing answered completed');
  
  const twimlString = twiml.toString();
  console.log("[TwiML] Generated TwiML:", twimlString);
  return twiml;
}

// Inbound call handler
app.post("/incoming-call", (req: Request, res: Response) => {
  const callDetails = {
    from: req.body.From,
    to: req.body.To,
    callSid: req.body.CallSid,
    direction: "inbound",
    timestamp: new Date().toISOString(),
  };
  
  console.log("[InboundCall] Received request:", callDetails);
  
  try {
    const twiml = generateStreamingTwiML("Hello! Connecting you to the AI assistant...");
    const response = twiml.toString();
    
    console.log("[InboundCall] Responding with TwiML for call:", {
      callSid: callDetails.callSid,
      twimlLength: response.length,
    });
    
    res.type("text/xml").send(response);
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error("[InboundCall] Error generating TwiML:", {
      callSid: callDetails.callSid,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).send("Server Error");
  }
});

// Outbound call endpoint with enhanced logging
app.post("/outbound-call", (req: Request, res: Response) => {
  (async () => {
    const timestamp = new Date().toISOString();
    const callDetails = {
      to: req.body.to,
      from: TWILIO_PHONE_NUMBER,
      direction: "outbound",
      timestamp,
    };

    console.log("[OutboundCall] Received request:", callDetails);

    try {
      if (!callDetails.to) {
        const error = "Missing 'to' phone number";
        console.error("[OutboundCall] Validation error:", { error, ...callDetails });
        res.status(400).json({ error });
        return;
      }

      // Generate TwiML without greeting for outbound calls
      const twiml = generateStreamingTwiML();
      const twimlString = twiml.toString();
      
      console.log("[OutboundCall] Creating call with config:", {
        ...callDetails,
        twimlLength: twimlString.length,
      });

      const call = await twilioClient.calls.create({
        from: TWILIO_PHONE_NUMBER,
        to: callDetails.to,
        twiml: twimlString,
      });

      const response = { success: true, sid: call.sid };
      console.log("[OutboundCall] Call initiated:", {
        ...callDetails,
        callSid: call.sid,
        status: call.status,
      });
      
      res.json(response);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      console.error("[OutboundCall] Error initiating call:", {
        ...callDetails,
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({ error: error.message });
    }
  })();
});

// Status callback endpoint (shared between inbound and outbound calls)
app.post("/status-callback", (req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
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

  console.log(`[Status Callback ${timestamp}] Call SID ${callSid}:`);
  console.log(`  Status: ${callStatus}`);
  console.log(`  Duration: ${duration || 0}s`);
  console.log(`  Sequence: ${sequence}`);
  console.log(`  Direction: ${direction}`);
  console.log(`  Source: ${source}`);
  console.log(`  Event Time: ${eventTimestamp}`);
  
  if (errorCode) {
    console.log(`  Error Code: ${errorCode}`);
    console.log(`  Error Message: ${errorMessage}`);
  }

  // Forward status updates to the frontend if logs connection exists
  if (currentLogs && currentLogs.readyState === WebSocket.OPEN) {
    currentLogs.send(JSON.stringify({
      type: "call.status",
      timestamp,
      callSid,
      callStatus,
      duration: duration || 0,
      errorCode,
      errorMessage,
      sequence,
      direction,
      source,
      eventTimestamp,
    }));
  }

  res.sendStatus(200);
});

let currentCall: WebSocket | null = null;
let currentLogs: WebSocket | null = null;

// Set up heartbeat to detect stale connections
function heartbeat(this: WebSocket & { isAlive: boolean }) {
  this.isAlive = true;
}

const interval = setInterval(() => {
  wss.clients.forEach((ws: WebSocket & { isAlive?: boolean }) => {
    if (ws.isAlive === false) {
      console.log("[WebSocket] Terminating stale connection");
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

// Enhanced WebSocket connection handling
wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  const timestamp = new Date().toISOString();
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);
  const connectionId = Math.random().toString(36).substring(2, 15);

  const connDetails = {
    id: connectionId,
    timestamp,
    url: req.url,
    remoteAddress: req.socket.remoteAddress,
    headers: {
      origin: req.headers.origin,
      host: req.headers.host,
      userAgent: req.headers['user-agent'],
    },
  };

  if (parts.length < 1) {
    console.error("[WebSocket] Rejected connection - no path specified", {
      ...connDetails,
      error: "Missing path in URL"
    });
    ws.close(1002, "Invalid path");
    return;
  }

  const type = parts[0];
  console.log("[WebSocket] New connection request", { 
    ...connDetails, 
    type 
  });

  // Set up ping/pong handling
  let isAlive = true;
  ws.on('pong', () => {
    isAlive = true;
  });

  // Handle ping messages from client
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      }
    } catch (error) {
      console.error("[WebSocket] Error parsing message:", error);
    }
  });

  // Set up connection timeout handling
  const pingInterval = setInterval(() => {
    if (!isAlive) {
      console.log("[WebSocket] Connection dead - terminating", {
        ...connDetails,
        type
      });
      ws.terminate();
      return;
    }
    isAlive = false;
    ws.ping();
  }, 30000);

  // Handle connection close
  ws.on('close', (code, reason) => {
    console.log("[WebSocket] Connection closed", {
      ...connDetails,
      type,
      code,
      reason: reason.toString()
    });
    clearInterval(pingInterval);
    
    // Clean up references based on connection type
    if (type === 'call' && ws === currentCall) {
      currentCall = null;
    } else if (type === 'logs' && ws === currentLogs) {
      currentLogs = null;
    }
  });

  // Handle connection errors
  ws.on('error', (error) => {
    console.error("[WebSocket] Connection error", {
      ...connDetails,
      type,
      error: error.message
    });
  });

  // Route the connection based on type
  switch (type) {
    case "call":
      if (currentCall) {
        console.log("[WebSocket] Closing existing call connection");
        currentCall.close(1000, "New connection replacing old");
      }
      currentCall = ws;
      handleCallConnection(ws, OPENAI_API_KEY);
      break;

    case "logs":
      if (currentLogs) {
        console.log("[WebSocket] Closing existing logs connection");
        currentLogs.close(1000, "New connection replacing old");
      }
      currentLogs = ws;
      handleFrontendConnection(ws);
      break;

    default:
      console.error("[WebSocket] Unknown connection type:", type);
      ws.close(1003, "Unknown connection type");
      break;
  }
});

// Enhanced WebSocket server error handling
wss.on("error", (error) => {
  console.error("[WebSocket] Server error:", {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
});

app.get("/tools", (req: Request, res: Response) => {
  console.log("[Server] /tools endpoint accessed");
  // Return only the serializable 'schema' property from each function
  const safeFunctions = functions.map((fn: any) => fn.schema);
  res.json(safeFunctions);
});

app.get("/public-url", (req: Request, res: Response) => {
  res.json({ publicUrl: PUBLIC_URL });
});

const port = process.env.PORT || 8081;
server.listen(port, () => {
  console.log(`[Server] Running on port ${port}`);
  console.log(`[Server] WebSocket endpoints:`);
  console.log(`[Server] - Call: ${PUBLIC_URL}/call`);
  console.log(`[Server] - Logs: ${PUBLIC_URL}/logs`);
});
