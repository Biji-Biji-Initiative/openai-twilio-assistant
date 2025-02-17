"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatErrorDetails = formatErrorDetails;
exports.isOriginAllowed = isOriginAllowed;
exports.verifyWebSocketClient = verifyWebSocketClient;
exports.generateStreamingTwiML = generateStreamingTwiML;
exports.logCallDetails = logCallDetails;
const logger_1 = require("./utils/logger");
const twilio_1 = __importDefault(require("twilio"));
function formatErrorDetails(error) {
    if (error instanceof Error) {
        return {
            message: error.message,
            name: error.name,
            stack: error.stack,
            code: error.code
        };
    }
    return {
        message: String(error)
    };
}
function isOriginAllowed(origin) {
    logger_1.logger.debug(`[CORS] Checking origin: ${origin}`);
    // Allow localhost development
    if (origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
        logger_1.logger.debug('[CORS] Allowing localhost origin');
        return true;
    }
    // Allow ngrok tunnels with more flexible patterns
    if (origin.match(/^https?:\/\/[a-zA-Z0-9-]+\.(ngrok\.io|ngrok\.app|ngrok-free\.app)$/)) {
        logger_1.logger.debug('[CORS] Allowing ngrok origin');
        return true;
    }
    // Allow specific domains (add your production domains here)
    const allowedDomains = [
        'mereka.ngrok.io'
    ];
    const isAllowed = allowedDomains.some(domain => origin.match(new RegExp(`^https?:\/\/${domain.replace('.', '\\.')}$`)));
    logger_1.logger.debug(`[CORS] Origin ${origin} allowed: ${isAllowed}`);
    return isAllowed;
}
function verifyWebSocketClient(info, callback) {
    const origin = info.origin;
    logger_1.logger.info(`[WebSocket] Verifying client connection from origin: ${origin}`);
    if (!origin) {
        logger_1.logger.warn('[WebSocket] Rejected connection with no origin');
        callback(false, 403, 'Origin not provided');
        return;
    }
    if (!isOriginAllowed(origin)) {
        logger_1.logger.warn(`[WebSocket] Rejected connection from unauthorized origin: ${origin}`);
        callback(false, 403, 'Origin not allowed');
        return;
    }
    logger_1.logger.info(`[WebSocket] Accepted connection from origin: ${origin}`);
    callback(true);
}
function generateStreamingTwiML(publicUrl, greeting) {
    const twiml = new twilio_1.default.twiml.VoiceResponse();
    if (greeting) {
        twiml.say(greeting);
    }
    twiml.connect().stream({
        url: `${publicUrl}/call`
    });
    twiml.say('Disconnected');
    return twiml;
}
function logCallDetails(context, details, message) {
    logger_1.logger.info(`[${context}] ${message}`, {
        ...details,
        timestamp: new Date().toISOString()
    });
}
//# sourceMappingURL=utils.js.map