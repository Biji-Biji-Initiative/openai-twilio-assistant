import { RawData, WebSocket } from "ws";
import functions from "./functionHandlers";
import logger, { setFrontendConnection } from "./logger";

interface Session {
  twilioConn?: WebSocket;
  frontendConn?: WebSocket;
  modelConn?: WebSocket;
  streamSid?: string;
  saved_config?: any;
  lastAssistantItem?: string;
  responseStartTimestamp?: number;
  latestMediaTimestamp?: number;
  openAIApiKey?: string;
}

let session: Session = {};

export function handleCallConnection(ws: WebSocket, openAIApiKey: string) {
  cleanupConnection(session.twilioConn);
  session.twilioConn = ws;
  session.openAIApiKey = openAIApiKey;

  logger.info("[Call] New connection established", {
    timestamp: new Date().toISOString(),
    hasExistingModel: !!session.modelConn,
    hasExistingFrontend: !!session.frontendConn
  });

  ws.on("message", handleTwilioMessage);
  ws.on("error", (error) => {
    logger.error("[Call] WebSocket error", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    ws.close();
  });
  ws.on("close", (code, reason) => {
    logger.info("[Call] Connection closed", {
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
    if (!session.frontendConn) session = {};
  });
}

export function handleFrontendConnection(ws: WebSocket) {
  cleanupConnection(session.frontendConn);
  session.frontendConn = ws;
  setFrontendConnection(ws);

  logger.info("[Frontend] New connection established", {
    timestamp: new Date().toISOString(),
    hasExistingCall: !!session.twilioConn,
    hasExistingModel: !!session.modelConn
  });

  ws.on("message", handleFrontendMessage);
  ws.on("error", (error) => {
    logger.error("[Frontend] WebSocket error", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    ws.close();
  });
  ws.on("close", (code, reason) => {
    logger.info("[Frontend] Connection closed", {
      code,
      reason: reason.toString(),
      timestamp: new Date().toISOString()
    });
    cleanupConnection(session.frontendConn);
    session.frontendConn = undefined;
    setFrontendConnection(null);
    if (!session.twilioConn && !session.modelConn) session = {};
  });
}

async function handleFunctionCall(item: { name: string; arguments: string }) {
  logger.info("Handling function call", { name: item.name });
  const fnDef = functions.find((f) => f.schema.name === item.name);
  if (!fnDef) {
    const error = `No handler found for function: ${item.name}`;
    logger.error(error);
    throw new Error(error);
  }

  let args: unknown;
  try {
    args = JSON.parse(item.arguments);
  } catch {
    const error = "Invalid JSON arguments for function call.";
    logger.error(error, { name: item.name, arguments: item.arguments });
    return JSON.stringify({ error });
  }

  try {
    logger.info("Executing function", { name: item.name, arguments: args });
    const result = await fnDef.handler(args as any);
    return result;
  } catch (err: any) {
    const error = `Error running function ${item.name}: ${err.message}`;
    logger.error(error, { stack: err.stack });
    return JSON.stringify({ error });
  }
}

function handleTwilioMessage(data: RawData) {
  const msg = parseMessage(data);
  if (!msg) return;

  switch (msg.event) {
    case "start":
      session.streamSid = msg.start.streamSid;
      session.latestMediaTimestamp = 0;
      session.lastAssistantItem = undefined;
      session.responseStartTimestamp = undefined;
      logger.info("Started new Twilio stream", { streamSid: session.streamSid });
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
      logger.info("Received close event from Twilio");
      closeAllConnections();
      break;
  }
}

function handleFrontendMessage(data: RawData) {
  const msg = parseMessage(data);
  if (!msg) {
    logger.warn("Received invalid message format from frontend");
    return;
  }

  logger.info("Received message from frontend", { type: msg.type });

  if (msg.type === "session.update") {
    logger.info("Processing session update", {
      instructions: msg.session?.instructions,
      voice: msg.session?.voice,
      toolCount: msg.session?.tools?.length || 0
    });
    
    session.saved_config = msg.session;
    logger.info("Updated saved configuration");
  }

  if (isOpen(session.modelConn)) {
    logger.info("Forwarding message to model connection");
    jsonSend(session.modelConn, msg);
  } else {
    logger.warn("Model connection not open, message not forwarded");
  }
}

function tryConnectModel() {
  if (!session.twilioConn || !session.streamSid || !session.openAIApiKey) {
    logger.warn("[Model] Cannot connect - missing required session data", {
      hasTwilioConn: !!session.twilioConn,
      hasStreamSid: !!session.streamSid,
      hasApiKey: !!session.openAIApiKey,
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  if (isOpen(session.modelConn)) {
    logger.info("[Model] Connection already open");
    return;
  }

  logger.info("[Model] Initiating connection");
  
  session.modelConn = new WebSocket(
    "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
    {
      headers: {
        Authorization: `Bearer ${session.openAIApiKey}`,
        "OpenAI-Beta": "realtime=v1",
      },
    }
  );

  session.modelConn.on("open", () => {
    logger.info("[Model] Connection established", {
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

    logger.info("[Model] Sending session configuration", {
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
    logger.error("[Model] Connection error", { 
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    closeModel();
  });
  session.modelConn.on("close", (code, reason) => {
    logger.info("[Model] Connection closed", {
      code,
      reason: reason.toString(),
      timestamp: new Date().toISOString()
    });
    closeModel();
  });
}

function handleModelMessage(data: RawData) {
  const event = parseMessage(data);
  if (!event) return;

  jsonSend(session.frontendConn, event);
  logger.debug("Model message received", { type: event.type });

  switch (event.type) {
    case "input_audio_buffer.speech_started":
      logger.info("Speech started, handling truncation");
      handleTruncation();
      break;

    case "response.audio.delta":
      if (session.twilioConn && session.streamSid) {
        if (session.responseStartTimestamp === undefined) {
          session.responseStartTimestamp = session.latestMediaTimestamp || 0;
          logger.debug("Started new response timing", { 
            timestamp: session.responseStartTimestamp 
          });
        }
        if (event.item_id) {
          session.lastAssistantItem = event.item_id;
          logger.debug("Updated assistant item", { itemId: event.item_id });
        }

        // Log audio packet metrics
        logger.debug("Sending audio packet", {
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
      } else {
        logger.warn("Cannot send audio delta - missing connection or streamSid");
      }
      break;

    case "response.output_item.done": {
      const { item } = event;
      logger.info("Output item completed", { 
        type: item.type,
        itemId: item.call_id 
      });

      if (item.type === "function_call") {
        handleFunctionCall(item)
          .then((output) => {
            if (session.modelConn) {
              logger.info("Function call completed successfully", {
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
            } else {
              logger.warn("Cannot send function output - model connection closed");
            }
          })
          .catch((err) => {
            logger.error("Error handling function call", {
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
    logger.debug("Skipping truncation - missing required data");
    return;
  }

  const elapsedMs = (session.latestMediaTimestamp || 0) - (session.responseStartTimestamp || 0);
  const audio_end_ms = elapsedMs > 0 ? elapsedMs : 0;

  logger.debug("Handling truncation", {
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
    logger.info("Truncated conversation item", { 
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
    logger.info("Sent clear audio mark to Twilio");
  }

  session.lastAssistantItem = undefined;
  session.responseStartTimestamp = undefined;
}

function closeModel() {
  cleanupConnection(session.modelConn);
  session.modelConn = undefined;
  if (!session.twilioConn && !session.frontendConn) session = {};
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
  logger.info("Closed all connections");
}

function cleanupConnection(ws?: WebSocket) {
  if (isOpen(ws)) ws.close();
}

function parseMessage(data: RawData): any {
  try {
    return JSON.parse(data.toString());
  } catch (error) {
    logger.error("Failed to parse message", {
      data: data.toString(),
      error: (error as Error).message
    });
    return null;
  }
}

function jsonSend(ws: WebSocket | undefined, obj: unknown) {
  if (!isOpen(ws)) {
    logger.warn("Attempted to send message but connection not open");
    return;
  }
  
  logger.debug("Sending message", { message: obj });
  ws.send(JSON.stringify(obj));
}

function isOpen(ws?: WebSocket): ws is WebSocket {
  return !!ws && ws.readyState === ws.OPEN;
}

export default session;
