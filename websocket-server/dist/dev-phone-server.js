"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const twilio_1 = __importDefault(require("twilio"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const router = (0, express_1.Router)();
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
    origin: function (origin, callback) {
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
        }
        else {
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
app.use((0, cors_1.default)(corsOptions));
// Handle preflight requests explicitly
app.options('*', (0, cors_1.default)(corsOptions));
// Add CORS headers for all responses
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        console.log(`[CORS Middleware] Processing request from origin: ${origin}`);
        const isAllowed = allowedOrigins.some(pattern => typeof pattern === 'string'
            ? pattern === origin
            : pattern.test(origin));
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
        }
        else {
            console.log(`[CORS Middleware] Rejected origin: ${origin}`);
        }
    }
    next();
});
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const PUBLIC_URL = (_a = process.env.PUBLIC_URL) === null || _a === void 0 ? void 0 : _a.replace(/\/$/, "");
// Log environment status
console.log("[DevPhone] Environment check:", {
    hasTwilioSid: !!TWILIO_ACCOUNT_SID,
    hasTwilioToken: !!TWILIO_AUTH_TOKEN,
    hasTwilioPhone: !!TWILIO_PHONE_NUMBER,
    hasPublicUrl: !!PUBLIC_URL
});
const twilioClient = (0, twilio_1.default)(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
const VoiceResponse = twilio_1.default.twiml.VoiceResponse;
// Simulate incoming call
const simulateIncoming = async (req, res) => {
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
    }
    catch (error) {
        console.error("[Dev Phone] Error simulating incoming call:", error);
        res.status(500).json({
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
// Outbound call endpoint
const outboundCall = async (req, res) => {
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
    }
    catch (error) {
        console.error("[Dev Phone] Error making outbound call:", error);
        res.status(500).json({
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
// Update call status
const updateCall = async (req, res) => {
    try {
        const { sid } = req.params;
        const { muted } = req.body;
        if (typeof muted !== 'boolean') {
            res.status(400).json({ error: "Missing or invalid 'muted' parameter" });
            return;
        }
        // Use type assertion to handle the muted property
        const call = await twilioClient.calls(sid).update({
            twiml: new twilio_1.default.twiml.VoiceResponse()
                .pause({ length: 1 })
                .toString()
        });
        res.json({ success: true, sid: call.sid });
    }
    catch (error) {
        console.error("[Dev Phone] Error updating call:", error);
        res.status(500).json({
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
// Add health check endpoint with proper CORS handling
app.get("/health", (0, cors_1.default)(corsOptions), (req, res) => {
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
    }
    catch (error) {
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
app.options("/health", (0, cors_1.default)(corsOptions));
// Add a simple ping endpoint for basic connectivity checks
app.get("/ping", (0, cors_1.default)(corsOptions), (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Add error handling middleware
app.use((err, req, res, next) => {
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
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`[Dev Phone] Port ${port} is already in use`);
                process.exit(1);
            }
            else {
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
    }
    catch (error) {
        console.error('[Dev Phone] Error starting server:', error);
        process.exit(1);
    }
};
startServer();
//# sourceMappingURL=dev-phone-server.js.map