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
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCallConnection = handleCallConnection;
exports.handleFrontendConnection = handleFrontendConnection;
const ws_1 = require("ws");
const functionHandlers_1 = __importDefault(require("./functionHandlers"));
const logger_1 = __importStar(require("./logger"));
let session = {};
function handleCallConnection(ws, openAIApiKey) {
    cleanupConnection(session.twilioConn);
    session.twilioConn = ws;
    session.openAIApiKey = openAIApiKey;
    logger_1.default.info("[Call] New connection established", {
        timestamp: new Date().toISOString(),
        hasExistingModel: !!session.modelConn,
        hasExistingFrontend: !!session.frontendConn
    });
    ws.on("message", handleTwilioMessage);
    ws.on("error", (error) => {
        logger_1.default.error("[Call] WebSocket error", {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        ws.close();
    });
    ws.on("close", (code, reason) => {
        logger_1.default.info("[Call] Connection closed", {
            code,
            reason: reason.toString(),
            timestamp: new Date().toISOString()
        });
        cleanupConnection(session.modelConn);
        cleanupConnection(session.twilioConn);
        session.twilioConn = undefined;
        session.modelConn = undefined;
        session.streamSid = undefined;
        session.lastAssistantItem = undefined;
        session.responseStartTimestamp = undefined;
        session.latestMediaTimestamp = undefined;
        if (!session.frontendConn)
            session = {};
    });
}
function handleFrontendConnection(ws) {
    cleanupConnection(session.frontendConn);
    session.frontendConn = ws;
    (0, logger_1.setFrontendConnection)(ws);
    logger_1.default.info("[Frontend] New connection established", {
        timestamp: new Date().toISOString(),
        hasExistingCall: !!session.twilioConn,
        hasExistingModel: !!session.modelConn
    });
    ws.on("message", handleFrontendMessage);
    ws.on("error", (error) => {
        logger_1.default.error("[Frontend] WebSocket error", {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        ws.close();
    });
    ws.on("close", (code, reason) => {
        logger_1.default.info("[Frontend] Connection closed", {
            code,
            reason: reason.toString(),
            timestamp: new Date().toISOString()
        });
        cleanupConnection(session.frontendConn);
        session.frontendConn = undefined;
        (0, logger_1.setFrontendConnection)(null);
        if (!session.twilioConn && !session.modelConn)
            session = {};
    });
}
async function handleFunctionCall(item) {
    logger_1.default.info("Handling function call", { name: item.name });
    const fnDef = functionHandlers_1.default.find((f) => f.schema.name === item.name);
    if (!fnDef) {
        const error = `No handler found for function: ${item.name}`;
        logger_1.default.error(error);
        throw new Error(error);
    }
    let args;
    try {
        args = JSON.parse(item.arguments);
    }
    catch (_a) {
        const error = "Invalid JSON arguments for function call.";
        logger_1.default.error(error, { name: item.name, arguments: item.arguments });
        return JSON.stringify({ error });
    }
    try {
        logger_1.default.info("Executing function", { name: item.name, arguments: args });
        const result = await fnDef.handler(args);
        return result;
    }
    catch (err) {
        const error = `Error running function ${item.name}: ${err.message}`;
        logger_1.default.error(error, { stack: err.stack });
        return JSON.stringify({ error });
    }
}
function handleTwilioMessage(data) {
    const msg = parseMessage(data);
    if (!msg)
        return;
    switch (msg.event) {
        case "start":
            session.streamSid = msg.start.streamSid;
            session.latestMediaTimestamp = 0;
            session.lastAssistantItem = undefined;
            session.responseStartTimestamp = undefined;
            logger_1.default.info("Started new Twilio stream", { streamSid: session.streamSid });
            tryConnectModel();
            break;
        case "media":
            session.latestMediaTimestamp = msg.media.timestamp;
            if (isOpen(session.modelConn)) {
                jsonSend(session.modelConn, {
                    type: "input_audio_buffer.append",
                    audio: msg.media.payload,
                });
            }
            break;
        case "close":
            logger_1.default.info("Received close event from Twilio");
            closeAllConnections();
            break;
    }
}
function handleFrontendMessage(data) {
    var _a, _b, _c, _d;
    const msg = parseMessage(data);
    if (!msg) {
        logger_1.default.warn("Received invalid message format from frontend");
        return;
    }
    logger_1.default.info("Received message from frontend", { type: msg.type });
    if (msg.type === "session.update") {
        logger_1.default.info("Processing session update", {
            instructions: (_a = msg.session) === null || _a === void 0 ? void 0 : _a.instructions,
            voice: (_b = msg.session) === null || _b === void 0 ? void 0 : _b.voice,
            toolCount: ((_d = (_c = msg.session) === null || _c === void 0 ? void 0 : _c.tools) === null || _d === void 0 ? void 0 : _d.length) || 0
        });
        session.saved_config = msg.session;
        logger_1.default.info("Updated saved configuration");
    }
    if (isOpen(session.modelConn)) {
        logger_1.default.info("Forwarding message to model connection");
        jsonSend(session.modelConn, msg);
    }
    else {
        logger_1.default.warn("Model connection not open, message not forwarded");
    }
}
function tryConnectModel() {
    if (!session.twilioConn || !session.streamSid || !session.openAIApiKey) {
        logger_1.default.warn("[Model] Cannot connect - missing required session data", {
            hasTwilioConn: !!session.twilioConn,
            hasStreamSid: !!session.streamSid,
            hasApiKey: !!session.openAIApiKey,
            timestamp: new Date().toISOString()
        });
        return;
    }
    if (isOpen(session.modelConn)) {
        logger_1.default.info("[Model] Connection already open");
        return;
    }
    logger_1.default.info("[Model] Initiating connection");
    session.modelConn = new ws_1.WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17", {
        headers: {
            Authorization: `Bearer ${session.openAIApiKey}`,
            "OpenAI-Beta": "realtime=v1",
        },
    });
    session.modelConn.on("open", () => {
        logger_1.default.info("[Model] Connection established", {
            timestamp: new Date().toISOString()
        });
        const config = session.saved_config || {};
        const sessionConfig = {
            instructions: config.instructions || "You are a helpful assistant in a phone call.",
            voice: config.voice || "ash",
            modalities: ["text", "audio"],
            turn_detection: { type: "server_vad" },
            input_audio_transcription: { model: "whisper-1" },
            input_audio_format: "g711_ulaw",
            output_audio_format: "g711_ulaw",
            tools: config.tools || [],
            ...config,
        };
        logger_1.default.info("[Model] Sending session configuration", {
            instructions: sessionConfig.instructions,
            voice: sessionConfig.voice,
            toolCount: sessionConfig.tools.length,
            timestamp: new Date().toISOString()
        });
        jsonSend(session.modelConn, {
            type: "session.update",
            session: sessionConfig,
        });
    });
    session.modelConn.on("message", handleModelMessage);
    session.modelConn.on("error", (error) => {
        logger_1.default.error("[Model] Connection error", {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        closeModel();
    });
    session.modelConn.on("close", (code, reason) => {
        logger_1.default.info("[Model] Connection closed", {
            code,
            reason: reason.toString(),
            timestamp: new Date().toISOString()
        });
        closeModel();
    });
}
function handleModelMessage(data) {
    const event = parseMessage(data);
    if (!event)
        return;
    jsonSend(session.frontendConn, event);
    logger_1.default.debug("Model message received", { type: event.type });
    switch (event.type) {
        case "input_audio_buffer.speech_started":
            logger_1.default.info("Speech started, handling truncation");
            handleTruncation();
            break;
        case "response.audio.delta":
            if (session.twilioConn && session.streamSid) {
                if (session.responseStartTimestamp === undefined) {
                    session.responseStartTimestamp = session.latestMediaTimestamp || 0;
                    logger_1.default.debug("Started new response timing", {
                        timestamp: session.responseStartTimestamp
                    });
                }
                if (event.item_id) {
                    session.lastAssistantItem = event.item_id;
                    logger_1.default.debug("Updated assistant item", { itemId: event.item_id });
                }
                // Log audio packet metrics
                logger_1.default.debug("Sending audio packet", {
                    streamSid: session.streamSid,
                    payloadSize: event.delta.length,
                    timestamp: new Date().toISOString()
                });
                jsonSend(session.twilioConn, {
                    event: "media",
                    streamSid: session.streamSid,
                    media: { payload: event.delta },
                });
                jsonSend(session.twilioConn, {
                    event: "mark",
                    streamSid: session.streamSid,
                });
            }
            else {
                logger_1.default.warn("Cannot send audio delta - missing connection or streamSid");
            }
            break;
        case "response.output_item.done": {
            const { item } = event;
            logger_1.default.info("Output item completed", {
                type: item.type,
                itemId: item.call_id
            });
            if (item.type === "function_call") {
                handleFunctionCall(item)
                    .then((output) => {
                    if (session.modelConn) {
                        logger_1.default.info("Function call completed successfully", {
                            name: item.name,
                            callId: item.call_id
                        });
                        jsonSend(session.modelConn, {
                            type: "conversation.item.create",
                            item: {
                                type: "function_call_output",
                                call_id: item.call_id,
                                output: JSON.stringify(output),
                            },
                        });
                        jsonSend(session.modelConn, { type: "response.create" });
                    }
                    else {
                        logger_1.default.warn("Cannot send function output - model connection closed");
                    }
                })
                    .catch((err) => {
                    logger_1.default.error("Error handling function call", {
                        error: err.message,
                        stack: err.stack,
                        name: item.name,
                        callId: item.call_id
                    });
                });
            }
            break;
        }
    }
}
function handleTruncation() {
    if (!session.lastAssistantItem || session.responseStartTimestamp === undefined) {
        logger_1.default.debug("Skipping truncation - missing required data");
        return;
    }
    const elapsedMs = (session.latestMediaTimestamp || 0) - (session.responseStartTimestamp || 0);
    const audio_end_ms = elapsedMs > 0 ? elapsedMs : 0;
    logger_1.default.debug("Handling truncation", {
        assistantItem: session.lastAssistantItem,
        elapsedMs,
        audio_end_ms
    });
    if (isOpen(session.modelConn)) {
        jsonSend(session.modelConn, {
            type: "conversation.item.truncate",
            item_id: session.lastAssistantItem,
            content_index: 0,
            audio_end_ms,
        });
        logger_1.default.info("Truncated conversation item", {
            itemId: session.lastAssistantItem,
            audioEndMs: audio_end_ms
        });
    }
    if (session.twilioConn && session.streamSid) {
        jsonSend(session.twilioConn, {
            event: "mark",
            streamSid: session.streamSid,
            mark: { name: "clear_audio" },
        });
        logger_1.default.info("Sent clear audio mark to Twilio");
    }
    session.lastAssistantItem = undefined;
    session.responseStartTimestamp = undefined;
}
function closeModel() {
    cleanupConnection(session.modelConn);
    session.modelConn = undefined;
    if (!session.twilioConn && !session.frontendConn)
        session = {};
}
function closeAllConnections() {
    if (session.twilioConn) {
        session.twilioConn.close();
        session.twilioConn = undefined;
    }
    if (session.modelConn) {
        session.modelConn.close();
        session.modelConn = undefined;
    }
    if (session.frontendConn) {
        session.frontendConn.close();
        session.frontendConn = undefined;
    }
    session.streamSid = undefined;
    session.lastAssistantItem = undefined;
    session.responseStartTimestamp = undefined;
    session.latestMediaTimestamp = undefined;
    session.saved_config = undefined;
    logger_1.default.info("Closed all connections");
}
function cleanupConnection(ws) {
    if (isOpen(ws))
        ws.close();
}
function parseMessage(data) {
    try {
        return JSON.parse(data.toString());
    }
    catch (error) {
        logger_1.default.error("Failed to parse message", {
            data: data.toString(),
            error: error.message
        });
        return null;
    }
}
function jsonSend(ws, obj) {
    if (!isOpen(ws)) {
        logger_1.default.warn("Attempted to send message but connection not open");
        return;
    }
    logger_1.default.debug("Sending message", { message: obj });
    ws.send(JSON.stringify(obj));
}
function isOpen(ws) {
    return !!ws && ws.readyState === ws_1.WebSocket.OPEN;
}
exports.default = session;
//# sourceMappingURL=sessionManager.js.map