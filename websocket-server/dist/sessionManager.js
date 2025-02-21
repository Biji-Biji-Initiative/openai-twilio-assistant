"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCallConnection = handleCallConnection;
exports.handleFrontendConnection = handleFrontendConnection;
const ws_1 = require("ws");
const functionHandlers_1 = __importDefault(require("./functionHandlers"));
let session = {};
function handleCallConnection(ws, openAIApiKey) {
    console.log('[Twilio] New call connection established');
    session.isClosing = true;
    cleanupConnection(session.twilioConn);
    session.isClosing = false;
    session.twilioConn = ws;
    session.openAIApiKey = openAIApiKey;
    ws.on("message", handleTwilioMessage);
    ws.on("error", (err) => {
        console.error('[Twilio] Call connection error:', err);
        ws.close();
    });
    ws.on("close", () => {
        console.log('[Twilio] Call connection closed');
        session.isClosing = true;
        cleanupConnection(session.modelConn);
        cleanupConnection(session.twilioConn);
        session.twilioConn = undefined;
        session.modelConn = undefined;
        session.streamSid = undefined;
        session.lastAssistantItem = undefined;
        session.responseStartTimestamp = undefined;
        session.latestMediaTimestamp = undefined;
        if (!session.frontendConn) {
            session = {};
        }
        session.isClosing = false;
    });
}
function handleFrontendConnection(ws) {
    console.log('[Frontend] New connection established');
    session.isClosing = true;
    cleanupConnection(session.frontendConn);
    session.isClosing = false;
    session.frontendConn = ws;
    ws.on("message", handleFrontendMessage);
    ws.on("error", (err) => {
        console.error('[Frontend] Connection error:', err);
        ws.close();
    });
    ws.on("close", () => {
        console.log('[Frontend] Connection closed');
        session.isClosing = true;
        cleanupConnection(session.frontendConn);
        session.frontendConn = undefined;
        if (!session.twilioConn && !session.modelConn) {
            session = {};
        }
        session.isClosing = false;
    });
}
function handleFunctionCall(item) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Handling function call:", item);
        const fnDef = functionHandlers_1.default.find((f) => f.schema.name === item.name);
        if (!fnDef) {
            throw new Error(`No handler found for function: ${item.name}`);
        }
        let args;
        try {
            args = JSON.parse(item.arguments);
        }
        catch (_a) {
            return JSON.stringify({
                error: "Invalid JSON arguments for function call.",
            });
        }
        try {
            console.log("Calling function:", fnDef.schema.name, args);
            const result = yield fnDef.handler(args);
            return result;
        }
        catch (err) {
            console.error("Error running function:", err);
            return JSON.stringify({
                error: `Error running function ${item.name}: ${err.message}`,
            });
        }
    });
}
function handleTwilioMessage(data) {
    var _a, _b;
    const msg = parseMessage(data);
    if (!msg) {
        console.error('❌ [Twilio] Failed to parse message');
        return;
    }
    // Handle media chunks without excessive logging
    if (msg.event === 'media') {
        if (msg.media) {
            session.latestMediaTimestamp = msg.media.timestamp;
            // Only attempt connection on first media packet
            if (!session.modelConn && !session.modelConnectionFailed && !session.lastMediaHandled) {
                console.log('🔄 [Twilio] First media packet received, initiating model connection...');
                tryConnectModel();
            }
            // Track that we've handled media
            session.lastMediaHandled = true;
            // Only send if connection is fully open
            if (((_a = session.modelConn) === null || _a === void 0 ? void 0 : _a.readyState) === ws_1.WebSocket.OPEN) {
                jsonSend(session.modelConn, {
                    type: 'input_audio_buffer.append',
                    audio: msg.media.payload,
                });
            }
            else if (session.modelConn && !session.modelConnectionFailed) {
                console.log(`🔍 [Twilio] Model connection not ready, state: ${session.modelConn.readyState}`);
            }
        }
        return;
    }
    // Log all non-media events with clear visual markers
    console.log(`\n📞 [Twilio] Event: ${msg.event}`);
    console.group();
    const timestamp = new Date().toISOString();
    // Forward all non-media Twilio messages to the frontend for logging
    if (isOpen(session.frontendConn)) {
        jsonSend(session.frontendConn, {
            type: 'twilio_event',
            timestamp,
            data: msg
        });
    }
    switch (msg.event) {
        case 'start':
            if ((_b = msg.start) === null || _b === void 0 ? void 0 : _b.streamSid) {
                session.streamSid = msg.start.streamSid;
                session.latestMediaTimestamp = 0;
                session.lastAssistantItem = undefined;
                session.responseStartTimestamp = undefined;
                console.log('🟢 [Twilio] Call started - SID:', msg.start.streamSid);
                tryConnectModel();
            }
            break;
        case 'stop':
        case 'close':
            console.log('🔴 [Twilio] Call ended - SID:', session.streamSid);
            closeAllConnections();
            break;
        case 'status':
            console.log('ℹ️  [Twilio] Call status:', msg.status);
            if (msg.status === 'completed' || msg.status === 'failed') {
                console.log('🔚 [Twilio] Call completed or failed, closing model connection');
                closeModel();
            }
            if (isOpen(session.frontendConn)) {
                jsonSend(session.frontendConn, {
                    type: 'call_status_update',
                    callSid: msg.callSid,
                    status: msg.status
                });
            }
            break;
    }
    console.groupEnd();
}
function handleFrontendMessage(data) {
    const msg = parseMessage(data);
    if (!msg)
        return;
    if (isOpen(session.modelConn)) {
        jsonSend(session.modelConn, msg);
    }
    if (msg.type === "session.update") {
        session.saved_config = msg.session;
    }
}
function tryConnectModel() {
    // Don't attempt connection if we're missing required data
    if (!session.twilioConn || !session.streamSid || !session.openAIApiKey) {
        console.log('⚠️ [Model] Missing required session data');
        return;
    }
    // Don't attempt if connection failed and hasn't been manually reset
    if (session.modelConnectionFailed) {
        console.log('🚫 [Model] Connection previously failed, manual reset required');
        return;
    }
    // Don't attempt if we already have a connection in any state
    if (session.modelConn) {
        const state = session.modelConn.readyState;
        console.log(`🔍 [Model] Current connection state: ${state}`);
        if (state === ws_1.WebSocket.CONNECTING) {
            console.log('⏳ [Model] Connection attempt already in progress');
            return;
        }
        if (state === ws_1.WebSocket.OPEN) {
            console.log('✅ [Model] Already connected');
            return;
        }
        // Clean up any non-active connection
        if (state === ws_1.WebSocket.CLOSING || state === ws_1.WebSocket.CLOSED) {
            console.log('🔄 [Model] Cleaning up inactive connection');
            cleanupConnection(session.modelConn);
            session.modelConn = undefined;
        }
    }
    // Don't attempt if we're in the process of closing
    if (session.isClosing) {
        console.log('⛔ [Model] Session is closing, skipping connection');
        return;
    }
    console.group('🔌 [Model] Connection Attempt');
    console.log('Initiating connection to OpenAI...');
    console.log('Stream SID:', session.streamSid);
    try {
        const modelConn = new ws_1.WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17", {
            headers: {
                Authorization: `Bearer ${session.openAIApiKey}`,
                "OpenAI-Beta": "realtime=v1",
            },
        });
        let hasOpened = false;
        let setupComplete = false;
        modelConn.on("open", () => {
            hasOpened = true;
            console.log('✅ [Model] WebSocket connection established');
            const config = session.saved_config || {};
            console.log('📝 [Model] Sending session configuration...');
            jsonSend(modelConn, {
                type: "session.update",
                session: Object.assign({ modalities: ["text", "audio"], turn_detection: { type: "server_vad" }, voice: "ash", input_audio_transcription: { model: "whisper-1" }, input_audio_format: "g711_ulaw", output_audio_format: "g711_ulaw" }, config),
            });
            setupComplete = true;
            console.log('✨ [Model] Session setup complete');
            console.groupEnd();
        });
        modelConn.on("message", (data) => {
            if (!setupComplete) {
                console.log('📨 [Model] Message received during setup:', data.toString().substring(0, 100));
            }
            handleModelMessage(data);
        });
        modelConn.on("error", (err) => {
            console.error('❌ [Model] Connection error:', err);
            if (!hasOpened) {
                console.error('❌ [Model] Connection failed to establish');
                session.modelConnectionFailed = true;
            }
            if (!session.isClosing) {
                closeModel();
            }
            console.groupEnd();
        });
        modelConn.on("close", () => {
            console.log('🔌 [Model] Connection closed');
            if (!hasOpened) {
                console.error('❌ [Model] Connection closed before establishing');
                session.modelConnectionFailed = true;
            }
            else if (!setupComplete) {
                console.error('❌ [Model] Connection closed before setup completion');
                session.modelConnectionFailed = true;
            }
            if (!session.isClosing) {
                closeModel();
            }
            console.groupEnd();
        });
        // Set the connection only after all handlers are attached
        session.modelConn = modelConn;
        console.log('👉 [Model] Connection handlers attached');
    }
    catch (err) {
        console.error('❌ [Model] Failed to establish connection:', err);
        session.modelConnectionFailed = true;
        if (!session.isClosing) {
            closeModel();
        }
        console.groupEnd();
    }
}
function handleModelMessage(data) {
    var _a;
    const event = parseMessage(data);
    if (!event) {
        console.error('[Model] Failed to parse message');
        return;
    }
    // Only log non-audio events to reduce noise
    if (!event.type.includes('audio')) {
        console.log('[Model] Event:', event.type);
    }
    // Forward to frontend with timestamp
    const timestamp = new Date().toISOString();
    if (isOpen(session.frontendConn)) {
        jsonSend(session.frontendConn, Object.assign(Object.assign({}, event), { timestamp }));
    }
    try {
        switch (event.type) {
            case 'input_audio_buffer.speech_started':
                handleTruncation();
                break;
            case 'response.audio.delta':
                if (event.delta && session.twilioConn && session.streamSid) {
                    if (session.responseStartTimestamp === undefined) {
                        session.responseStartTimestamp = session.latestMediaTimestamp || 0;
                    }
                    if (event.item_id) {
                        session.lastAssistantItem = event.item_id;
                    }
                    // Send audio data and mark in a single batch
                    jsonSend(session.twilioConn, {
                        event: 'media',
                        streamSid: session.streamSid,
                        media: { payload: event.delta },
                    });
                    jsonSend(session.twilioConn, {
                        event: 'mark',
                        streamSid: session.streamSid,
                    });
                }
                break;
            case 'response.output_item.done':
                if (((_a = event.item) === null || _a === void 0 ? void 0 : _a.type) === 'function_call' && event.item.name && event.item.arguments) {
                    handleFunctionCall({
                        name: event.item.name,
                        arguments: event.item.arguments
                    }).then((output) => {
                        var _a;
                        if (isOpen(session.modelConn) && ((_a = event.item) === null || _a === void 0 ? void 0 : _a.call_id)) {
                            // Send function output and create new response
                            jsonSend(session.modelConn, {
                                type: 'conversation.item.create',
                                item: {
                                    type: 'function_call_output',
                                    call_id: event.item.call_id,
                                    output, // Send raw output, jsonSend will stringify
                                },
                            });
                            jsonSend(session.modelConn, { type: 'response.create' });
                        }
                    }).catch((err) => {
                        console.error('[Model] Error handling function call:', err);
                    });
                }
                break;
            default:
                console.log('[Model] Unhandled event type:', event.type);
        }
    }
    catch (error) {
        console.error('[Model] Error processing message:', error);
        if (!session.isClosing) {
            closeModel();
        }
    }
}
function handleTruncation() {
    if (!session.lastAssistantItem ||
        session.responseStartTimestamp === undefined)
        return;
    const elapsedMs = (session.latestMediaTimestamp || 0) - (session.responseStartTimestamp || 0);
    const audio_end_ms = elapsedMs > 0 ? elapsedMs : 0;
    if (isOpen(session.modelConn)) {
        jsonSend(session.modelConn, {
            type: "conversation.item.truncate",
            item_id: session.lastAssistantItem,
            content_index: 0,
            audio_end_ms,
        });
    }
    if (session.twilioConn && session.streamSid) {
        jsonSend(session.twilioConn, {
            event: "clear",
            streamSid: session.streamSid,
        });
    }
    session.lastAssistantItem = undefined;
    session.responseStartTimestamp = undefined;
}
function closeModel() {
    if (!session.isClosing) {
        session.isClosing = true;
        console.log('🔌 [Model] Closing connection');
        // Log connection state for debugging
        if (session.modelConn) {
            console.log(`🔍 [Model] Connection state before close: ${session.modelConn.readyState}`);
        }
        cleanupConnection(session.modelConn);
        session.modelConn = undefined;
        // Mark connection as failed to prevent auto-reconnect
        session.modelConnectionFailed = true;
        // Only reset call state, preserve session metadata
        if (!session.twilioConn && !session.frontendConn) {
            console.log('🗑 [Session] No active connections, resetting call state');
            session.lastAssistantItem = undefined;
            session.responseStartTimestamp = undefined;
            session.latestMediaTimestamp = undefined;
            session.streamSid = undefined;
        }
        // Small delay before resetting isClosing to prevent race conditions
        setTimeout(() => {
            session.isClosing = false;
        }, 100);
    }
}
function closeAllConnections() {
    if (!session.isClosing) {
        session.isClosing = true;
        console.log('🗑 [Session] Closing all connections');
        // Save important session data
        const savedConfig = session.saved_config;
        const apiKey = session.openAIApiKey;
        if (session.twilioConn) {
            console.log('🔌 [Twilio] Closing connection');
            cleanupConnection(session.twilioConn);
            session.twilioConn = undefined;
        }
        if (session.modelConn) {
            console.log('🔌 [Model] Closing connection');
            cleanupConnection(session.modelConn);
            session.modelConn = undefined;
        }
        if (session.frontendConn) {
            console.log('🔌 [Frontend] Closing connection');
            cleanupConnection(session.frontendConn);
            session.frontendConn = undefined;
        }
        // Reset session but preserve important metadata
        session = {
            saved_config: savedConfig,
            openAIApiKey: apiKey,
            modelConnectionFailed: true // Prevent auto-reconnect until manual intervention
        };
        // Small delay before resetting isClosing to prevent race conditions
        setTimeout(() => {
            session.isClosing = false;
        }, 100);
    }
}
function cleanupConnection(ws) {
    if (isOpen(ws))
        ws.close();
}
function parseMessage(data) {
    try {
        return JSON.parse(data.toString());
    }
    catch (_a) {
        return null;
    }
}
function jsonSend(ws, obj) {
    if (!isOpen(ws))
        return;
    ws.send(JSON.stringify(obj));
}
function isOpen(ws) {
    return !!ws && ws.readyState === ws_1.WebSocket.OPEN;
}
