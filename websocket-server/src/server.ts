import express from "express";
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
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string;
const PUBLIC_URL = process.env.PUBLIC_URL as string;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID as string;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN as string;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER as string;

if (!OPENAI_API_KEY || !PUBLIC_URL || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const twimlTemplate = readFileSync(join(__dirname, "../twiml.xml"), "utf-8");

// Initialize Twilio client
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

app.get("/public-url", (req, res) => {
  res.json({ publicUrl: PUBLIC_URL });
});

app.all("/twiml", (req, res) => {
  const wsUrl = new URL(PUBLIC_URL);
  wsUrl.protocol = "wss:";
  wsUrl.pathname = `/call`;

  const twimlContent = twimlTemplate.replace("{{WS_URL}}", wsUrl.toString());
  res.type("text/xml").send(twimlContent);
});

// New endpoint to list available tools (schemas)
app.get("/tools", (req, res) => {
  res.json(functions.map((f) => f.schema));
});

// Add outbound call endpoint
app.post("/outbound-call", async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) {
      return res.status(400).json({ error: "Missing 'to' phone number." });
    }

    // TwiML with <Stream> referencing your bridging route
    const outboundTwiML = `
      <Response>
        <Connect>
          <Stream url="${PUBLIC_URL}/call" />
        </Connect>
      </Response>
    `;

    const call = await twilioClient.calls.create({
      from: TWILIO_PHONE_NUMBER,
      to,
      twiml: outboundTwiML,
    });

    console.log(`Outbound call to ${to} initiated. SID: ${call.sid}`);
    res.json({ success: true, sid: call.sid });
  } catch (err) {
    console.error("Error in /outbound-call:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

let currentCall: WebSocket | null = null;
let currentLogs: WebSocket | null = null;

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);

  if (parts.length < 1) {
    ws.close();
    return;
  }

  const type = parts[0];

  if (type === "call") {
    if (currentCall) currentCall.close();
    currentCall = ws;
    handleCallConnection(currentCall, OPENAI_API_KEY);
  } else if (type === "logs") {
    if (currentLogs) currentLogs.close();
    currentLogs = ws;
    handleFrontendConnection(currentLogs);
  } else {
    ws.close();
  }
});

const port = process.env.PORT || 8081;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
