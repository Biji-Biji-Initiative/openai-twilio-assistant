"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const ws_1 = __importDefault(require("ws"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const twilio_1 = __importDefault(require("twilio"));
const logger_1 = require("./utils/logger");
const ws_handler_1 = require("./handlers/ws-handler");
const http_handler_1 = require("./handlers/http-handler");
const utils_1 = require("./utils");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
// Global CORS middleware configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, etc.)
        if (!origin) {
            logger_1.logger.info('[CORS] Allowing request with no origin');
            callback(null, true);
            return;
        }
        if ((0, utils_1.isOriginAllowed)(origin)) {
            logger_1.logger.info(`[CORS] Allowing origin: ${origin}`);
            callback(null, true);
        }
        else {
            logger_1.logger.warn(`[CORS] Rejected origin: ${origin}`);
            callback(new Error('CORS not allowed'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Accept'],
    exposedHeaders: ['Content-Length', 'Content-Type']
};
// Apply CORS middleware
app.use((0, cors_1.default)(corsOptions));
// Add CORS headers for WebSocket upgrade requests
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (0, utils_1.isOriginAllowed)(origin)) {
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
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
// Initialize WebSocket server
const wss = new ws_1.default.Server({ server });
// Environment variables
const PORT = process.env.PORT || 8081;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PUBLIC_URL = (_a = process.env.PUBLIC_URL) === null || _a === void 0 ? void 0 : _a.replace(/\/$/, ""); // Remove trailing slash if present
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
// Log environment variables (excluding sensitive data)
logger_1.logger.info('Environment variables:', {
    PORT,
    OPENAI_API_KEY: OPENAI_API_KEY ? '[SET]' : '[NOT SET]',
    TWILIO_ACCOUNT_SID: TWILIO_ACCOUNT_SID ? '[SET]' : '[NOT SET]',
    TWILIO_AUTH_TOKEN: TWILIO_AUTH_TOKEN ? '[SET]' : '[NOT SET]',
    TWILIO_PHONE_NUMBER: TWILIO_PHONE_NUMBER ? '[SET]' : '[NOT SET]'
});
// Only exit in production if variables are missing
if (process.env.NODE_ENV === 'production' && (!OPENAI_API_KEY || !PUBLIC_URL || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER)) {
    logger_1.logger.error("[Server] Missing required environment variables in production");
    process.exit(1);
}
logger_1.logger.info("[Server] Using PUBLIC_URL:", PUBLIC_URL || 'http://localhost:8081');
// Initialize Twilio client
const twilioClient = (0, twilio_1.default)(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
// Setup WebSocket server with OpenAI integration
(0, ws_handler_1.setupWebSocketServer)(wss, OPENAI_API_KEY || '');
// Setup HTTP routes
app.use(http_handler_1.handleHttpRequest);
// Inbound call handler
app.post("/incoming-call", (req, res) => {
    const callDetails = {
        from: req.body.From,
        to: req.body.To,
        callSid: req.body.CallSid,
        direction: 'inbound',
        timestamp: new Date().toISOString()
    };
    (0, utils_1.logCallDetails)('IncomingCall', callDetails, 'Received inbound call');
    const twiml = (0, utils_1.generateStreamingTwiML)(PUBLIC_URL, 'Connected');
    res.type('text/xml');
    res.send(twiml.toString());
});
// Status callback endpoint (shared between inbound and outbound calls)
app.post("/status-callback", (req, res) => {
    const { CallSid: callSid, CallStatus: callStatus, CallDuration: duration, ErrorCode: errorCode, ErrorMessage: errorMessage, SequenceNumber: sequence, Direction: direction, CallbackSource: source, Timestamp: eventTimestamp, } = req.body;
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
    (0, utils_1.logCallDetails)('StatusCallback', statusDetails, 'Call status update received');
    // Forward status updates to the frontend if logs connection exists
    if ((ws_handler_1.currentLogs === null || ws_handler_1.currentLogs === void 0 ? void 0 : ws_handler_1.currentLogs.readyState) === ws_1.default.OPEN) {
        try {
            ws_handler_1.currentLogs.send(JSON.stringify({
                type: "call.status",
                ...statusDetails,
                timestamp: new Date().toISOString(),
            }));
            logger_1.logger.debug('[StatusCallback] Forwarded status to frontend');
        }
        catch (err) {
            const error = (0, utils_1.formatErrorDetails)(err);
            logger_1.logger.error('[StatusCallback] Error forwarding status to frontend:', error);
            // Try to notify frontend about the error
            try {
                ws_handler_1.currentLogs.send(JSON.stringify({
                    type: "error",
                    error: "Failed to forward call status",
                    details: error.message,
                    timestamp: new Date().toISOString(),
                }));
            }
            catch (sendError) {
                logger_1.logger.error('[StatusCallback] Failed to send error notification:', (0, utils_1.formatErrorDetails)(sendError));
            }
        }
    }
    else {
        logger_1.logger.warn('[StatusCallback] No active logs connection to forward status');
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
app.use((err, req, res, next) => {
    const error = (0, utils_1.formatErrorDetails)(err);
    logger_1.logger.error('[Server] Unhandled error:', error);
    res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
    });
});
// Start server
server.listen(PORT, () => {
    const publicUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
    logger_1.logger.info(`Server is running on port ${PORT}`);
    logger_1.logger.info(`Public URL: ${publicUrl}`);
    logger_1.logger.info(`WebSocket endpoints:`);
    logger_1.logger.info(`- Call: ${publicUrl}/call`);
    logger_1.logger.info(`- Logs: ${publicUrl}/logs`);
});
//# sourceMappingURL=server.js.map