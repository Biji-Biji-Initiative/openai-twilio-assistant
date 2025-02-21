"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ws_1 = require("ws");
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const fs_1 = require("fs");
const path_1 = require("path");
const cors_1 = __importDefault(require("cors"));
const sessionManager_1 = require("./sessionManager");
const functionHandlers_1 = __importDefault(require("./functionHandlers"));
dotenv_1.default.config();
const PORT = 8081; // Fixed port for consistency
const PUBLIC_URL = process.env.PUBLIC_URL || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY environment variable is required");
    process.exit(1);
}
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
// Add proper request parsing
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ server });
const twimlPath = (0, path_1.join)(__dirname, "twiml.xml");
const twimlTemplate = (0, fs_1.readFileSync)(twimlPath, "utf-8");
app.get("/public-url", (req, res) => {
    res.json({ publicUrl: PUBLIC_URL });
});
// Function to generate TwiML response
function generateTwiML(req) {
    const wsUrl = new URL(PUBLIC_URL);
    wsUrl.protocol = "wss:";
    // Use /call to match Twilio's expected protocol
    wsUrl.pathname = "/call";
    // Log the generated URLs for debugging
    console.log('📝 Generating TwiML with URLs:', {
        wsUrl: wsUrl.toString(),
        publicUrl: PUBLIC_URL
    });
    let twimlContent = twimlTemplate
        .replace("{{WS_URL}}", wsUrl.toString())
        .replace("{{PUBLIC_URL}}", PUBLIC_URL);
    return twimlContent;
}
// Handle both /twiml and /api/twiml paths
app.all(["/twiml", "/api/twiml"], (req, res) => {
    console.log(`TwiML endpoint called via ${req.method} at ${req.path}`);
    const twimlContent = generateTwiML(req);
    res.type("text/xml").send(twimlContent);
});
// New endpoint to list available tools (schemas)
app.get("/tools", (req, res) => {
    res.json(functionHandlers_1.default.map((f) => f.schema));
});
let currentCall = null;
let currentLogs = null;
// Handle status callbacks from Twilio
app.post("/api/call/status", (req, res) => {
    const status = {
        callSid: req.body.CallSid,
        status: req.body.CallStatus,
        timestamp: new Date().toISOString()
    };
    console.log('📞 Call status update:', status);
    // Forward to frontend if connected
    if ((currentLogs === null || currentLogs === void 0 ? void 0 : currentLogs.readyState) === ws_1.WebSocket.OPEN) {
        currentLogs.send(JSON.stringify({
            type: 'twilio_event',
            data: Object.assign({ event: 'status' }, status)
        }));
    }
    res.sendStatus(200);
});
wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const parts = url.pathname.split("/").filter(Boolean);
    console.log('🔌 New WebSocket connection:', {
        url: req.url,
        path: url.pathname,
        parts,
        headers: req.headers
    });
    if (parts.length < 1) {
        console.warn('❌ Invalid WebSocket path, closing connection');
        ws.close();
        return;
    }
    const path = parts[0];
    console.log('🛠️ WebSocket path:', path);
    if (path === "call") {
        console.log('📞 [Call] New connection request');
        // Log headers to verify Twilio's connection
        console.log('📋 [Call] Connection headers:', req.headers);
        if (currentCall) {
            console.log('🔄 [Call] Closing existing connection');
            currentCall.close();
        }
        // Set up WebSocket event handlers
        ws.on('open', () => {
            console.log('🌟 [Call] WebSocket connection opened');
        });
        ws.on('close', () => {
            console.log('🔴 [Call] WebSocket connection closed');
        });
        ws.on('error', (error) => {
            console.error('❌ [Call] WebSocket error:', error);
        });
        currentCall = ws;
        console.log('✅ [Call] Connection assigned as current call');
        // Handle Twilio protocol messages
        ws.on('message', (data) => {
            var _a, _b;
            try {
                const rawMessage = data.toString();
                console.log('📬 [Call] Raw message received:', rawMessage);
                const msg = JSON.parse(rawMessage);
                console.log('📥 [Call] Parsed message:', msg);
                if (msg.event === 'start') {
                    console.log('🚀 [Call] Received start event');
                    console.log('📊 [Call] Start message details:', {
                        streamSid: msg.streamSid,
                        tracks: (_a = msg.start) === null || _a === void 0 ? void 0 : _a.tracks
                    });
                    const response = {
                        event: 'start',
                        protocol: 'wss',
                        version: '1.0.0',
                        streamSid: msg.streamSid,
                        tracks: ((_b = msg.start) === null || _b === void 0 ? void 0 : _b.tracks) ? [{ id: msg.start.tracks[0].id }] : []
                    };
                    console.log('📤 [Call] Sending response:', response);
                    ws.send(JSON.stringify(response));
                }
            }
            catch (error) {
                console.error('❌ [Call] Error handling message:', error);
            }
        });
        (0, sessionManager_1.handleCallConnection)(currentCall, OPENAI_API_KEY);
    }
    else if (path === "logs") {
        console.log('📝 Handling logs connection');
        if (currentLogs) {
            console.log('🔄 Closing existing logs connection');
            currentLogs.close();
        }
        currentLogs = ws;
        (0, sessionManager_1.handleFrontendConnection)(currentLogs);
        // Send initial connected message
        ws.send(JSON.stringify({
            type: "status",
            message: "WebSocket connection established"
        }));
    }
    else {
        console.error("❌ Unknown connection type. Path:", path);
        ws.close();
    }
});
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
