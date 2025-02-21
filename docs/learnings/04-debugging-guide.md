# Debugging Guide

## 🔍 Real Issues and Solutions

### 1. Connection Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| WSS Connection Fails | Using `ws://` instead of `wss://` | Update `wsUrl.protocol = "wss:"` in TwiML generation |
| Multiple Connections | Not closing old connection | Ensure `currentCall.close()` before new connection |
| Domain Mismatch | Wrong ngrok domain | Check domain is exactly `mereka.ngrok.io` |
| Track ID Mismatch | Wrong track name in TwiML | Set `track="inbound"` in TwiML parameters |
| Audio Format Error | Incorrect mulaw config | Use exact format: `audio/x-mulaw`, rate: 8000, channels: 1 |

### 2. Common Error Messages

```typescript
// In server.ts - actual error handling
wss.on('connection', (ws: WebSocket, req: Request) => {
  const path = req.url?.split('/')?.[1];
  
  if (!path) {
    console.error('❌ Missing path in connection request');
    ws.close();
    return;
  }
  
  if (path !== 'call' && path !== 'logs') {
    console.error('❌ Unknown connection type:', path);
    ws.close();
    return;
  }
  
  // Connection type specific handling...
});

// In handleCallConnection
function handleCallConnection(ws: WebSocket) {
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      
      // Validate start message
      if (msg.event === 'start') {
        if (!msg.streamSid) {
          throw new Error('Missing streamSid in start message');
        }
        if (!msg.start?.tracks?.[0]) {
          throw new Error('Missing track configuration');
        }
        const track = msg.start.tracks[0];
        if (track.id !== 'inbound') {
          throw new Error(`Invalid track id: ${track.id}`);
        }
      }
      
      // Handle message...
    } catch (error) {
      console.error('❌ Message handling error:', error);
      ws.close();
    }
  });
}
```

### 3. Diagnostic Commands

```bash
# 1. Check TwiML endpoint
curl https://mereka.ngrok.io/twiml

# 2. Verify ngrok tunnel
curl http://localhost:4040/api/tunnels

# 3. Test WebSocket connection
wscat -c wss://mereka.ngrok.io/call
```

### 4. Real Log Examples

```typescript
// In server.ts - our actual logging
const log = (category: string, event: string, data?: any) => {
  const entry = {
    timestamp: new Date().toISOString(),
    category,
    event,
    data
  };
  console.log(JSON.stringify(entry));
  
  // Send to frontend if connected
  if (currentLogs) {
    currentLogs.send(JSON.stringify(entry));
  }
};

// Example usage:
log('call', 'connection_opened', { streamSid });
log('call', 'start_received', { tracks });
log('call', 'audio_received', { bytes: data.length });
log('call', 'error_occurred', { error: error.message });
```

## Real-World Debugging Steps

### 1. Connection Issues

```typescript
// In server.ts - connection validation
app.all("/twiml", (req, res) => {
  const wsUrl = new URL(PUBLIC_URL);
  wsUrl.protocol = "wss:";
  wsUrl.pathname = "/call";
  
  // Domain validation
  if (wsUrl.hostname !== 'mereka.ngrok.io') {
    console.error('❌ Invalid domain:', wsUrl.hostname);
    res.status(500).send('Invalid domain');
    return;
  }
  
  // Twilio signature validation
  const twilioSignature = req.headers['x-twilio-signature'];
  if (!twilioSignature) {
    console.error('❌ Missing Twilio signature');
    res.status(401).send('Unauthorized');
    return;
  }
  
  // Generate and send TwiML
  const twimlContent = twimlTemplate.replace("{{WS_URL}}", wsUrl.toString());
  res.type("text/xml").send(twimlContent);
});
```

### 2. Audio Issues

```typescript
// In handleCallConnection - audio validation
ws.on('message', (data) => {
  try {
    // For media messages
    if (data instanceof Buffer) {
      if (data.length === 0) {
        log('call', 'warning', 'Received empty audio buffer');
        return;
      }
      
      // Process audio...
      processAudioChunk(data);
      return;
    }
    
    // For control messages
    const msg = JSON.parse(data.toString());
    if (msg.event === 'media') {
      if (msg.media.track !== 'inbound') {
        throw new Error('Invalid track in media message');
      }
      if (msg.media.format !== 'audio/x-mulaw') {
        throw new Error('Unsupported audio format');
      }
      if (msg.media.payload?.length === 0) {
        log('call', 'warning', 'Empty media payload');
      }
    }
  } catch (error) {
    console.error('❌ Audio processing error:', error);
  }
});
```

#### Symptoms
- Connection establishes but immediately closes
- No start message received
- Error in protocol negotiation

#### Diagnostic Steps
1. Log raw messages:
   ```typescript
   console.log('📬 [Call] Raw message:', data.toString());
   ```

2. Check start message format:
   ```typescript
   console.log('🚀 [Call] Start event:', msg.start);
   ```

3. Verify response format:
   ```typescript
   console.log('📤 [Call] Response:', response);
   ```

#### Solutions
- Match track IDs exactly
- Include all required protocol fields
- Verify audio format parameters

### 3. Audio Stream Issues

#### Symptoms
- Connection established but no audio
- Errors in media processing
- One-way audio only

#### Diagnostic Steps
1. Check track configuration:
   ```xml
   <Parameter name="track" value="inbound" />
   <Parameter name="format" value="audio/x-mulaw" />
   ```

2. Verify media messages:
   ```typescript
   console.log('🎵 [Call] Media format:', msg.media?.format);
   ```

3. Monitor stream status:
   ```typescript
   console.log('📊 [Call] Stream stats:', {
    received: bytesReceived,
    processed: bytesProcessed
   });
   ```

## Monitoring Tools

### 1. Ngrok Inspector
- Web Interface: http://127.0.0.1:4040
- Real-time traffic monitoring
- WebSocket connection status
- Request/Response inspection

### 2. Server Logs
- Connection lifecycle events
- Protocol message exchange
- Error conditions
- Performance metrics

### 3. Twilio Console
- Call status updates
- Error reports
- Media metrics
- Connection statistics

## Testing Procedures

### 1. Connection Testing
```bash
# Test TwiML endpoint
curl http://localhost:8081/twiml

# Verify ngrok forwarding
curl https://mereka.ngrok.io/twiml

# Test call initiation
curl -X POST http://localhost:3000/api/call \
  -H "Content-Type: application/json" \
  -d '{"from": "+60393880542", "to": "60393880467"}'
```

### 2. Protocol Testing
- Monitor start message receipt
- Verify response format
- Check track configuration
- Validate audio parameters

### 3. Audio Testing
- Verify format parameters
- Check sample rate
- Monitor data flow
- Test bidirectional audio

## Best Practices

### 1. Logging Best Practices
```typescript
// 1. Use structured logging
const log = (category: string, event: string, data?: any) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    category,
    event,
    data
  }));
};

// 2. Use consistent categories
const LogCategory = {
  WEBSOCKET: 'ws',
  CALL: 'call',
  TWIML: 'twiml',
  PROTOCOL: 'protocol'
} as const;

// 3. Track connection lifecycle
ws.on('open', () => {
  log(LogCategory.WEBSOCKET, 'connected', {
    url: ws.url,
    protocol: ws.protocol
  });
});

// 4. Log with context
ws.on('message', (data) => {
  log(LogCategory.PROTOCOL, 'message', {
    raw: data.toString(),
    parsed: JSON.parse(data.toString()),
    time: Date.now()
  });
});
```

### 2. Error Handling
```typescript
// 1. Custom error types
class WebSocketError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly data?: any
  ) {
    super(message);
    this.name = 'WebSocketError';
  }
}

// 2. Error boundaries
try {
  const msg = JSON.parse(data);
  handleMessage(msg);
} catch (error) {
  log(LogCategory.PROTOCOL, 'error', {
    type: error.name,
    message: error.message,
    stack: error.stack
  });
}

// 3. Graceful degradation
ws.on('error', (error) => {
  log(LogCategory.WEBSOCKET, 'error', error);
  // Attempt recovery
  setTimeout(() => {
    log(LogCategory.WEBSOCKET, 'recovery_attempt');
    initializeWebSocket();
  }, 1000);
});
```

### 3. Monitoring Guidelines
```typescript
// 1. Health checks
function checkHealth(): HealthStatus {
  return {
    ngrok: isNgrokRunning(),
    websocket: getWebSocketStatus(),
    calls: getActiveCalls(),
    memory: process.memoryUsage()
  };
}

// 2. Performance tracking
const metrics = {
  messageCount: 0,
  errorCount: 0,
  lastMessageTime: null as number | null,
  avgProcessingTime: 0
};

// 3. Resource monitoring
setInterval(() => {
  log(LogCategory.SYSTEM, 'metrics', {
    metrics,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
}, 60000);
```

### 2. Error Handling
- Catch and log all errors
- Provide detailed context
- Include error recovery
- Clean up resources

### 3. Testing
- Test each component
- Verify end-to-end flow
- Monitor all interfaces
- Document test cases
