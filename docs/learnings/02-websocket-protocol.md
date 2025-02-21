# WebSocket Protocol Guide

## Critical Protocol Requirements

### 🔥 Most Common Issues We Faced

1. **Wrong Protocol Handshake**
   - SYMPTOM: Connection closes immediately
   - CAUSE: Incorrect response to start message
   - SOLUTION: Exact match of track IDs and parameters

2. **Audio Format Mismatch**
   - SYMPTOM: No audio received
   - CAUSE: Wrong format parameters in TwiML
   - SOLUTION: Use exact mulaw configuration

3. **Multiple Connections**
   - SYMPTOM: Audio stream interruptions
   - CAUSE: New connection without closing old
   - SOLUTION: Single connection management

## Connection Lifecycle

### 1. Initial Connection

#### Required Setup
```typescript
// CRITICAL: Must use these exact settings
const server = new WebSocketServer({
  port: 8081,
  path: '/call'  // Must match TwiML
});
```

#### Connection Requirements
- Endpoint: `/call` (must match TwiML)
- Protocol: `wss://` (HTTPS not supported)
- Domain: `mereka.ngrok.io` (fixed domain)

#### Headers to Monitor
```typescript
console.log('🔍 Connection headers:', {
  upgrade: req.headers.upgrade,        // Must be 'websocket'
  connection: req.headers.connection,  // Must be 'Upgrade'
  protocol: req.headers.protocol      // Must be 'wss'
});
```

⚠️ **Common Pitfalls**:
1. Using wrong endpoint path
2. HTTP instead of WSS
3. Missing protocol headers
4. Wrong domain configuration

### 2. Protocol Messages

#### Start Message Handling

```typescript
// CRITICAL: Validate every start message
function validateStartMessage(msg: any) {
  if (!msg.event || msg.event !== 'start') {
    throw new Error('Invalid event type');
  }
  if (!msg.streamSid) {
    throw new Error('Missing streamSid');
  }
  if (!msg.start?.tracks?.[0]) {
    throw new Error('Missing track configuration');
  }
  
  const track = msg.start.tracks[0];
  if (track.id !== 'inbound' ||
      track.format !== 'audio/x-mulaw' ||
      track.rate !== 8000 ||
      track.channels !== 1) {
    throw new Error('Invalid track configuration');
  }
}
```

#### Expected Messages

1. **Start Message (From Twilio)**
```json
{
  "event": "start",
  "streamSid": "MTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "start": {
    "tracks": [
      {
        "id": "inbound",        // MUST be "inbound"
        "format": "audio/x-mulaw", // MUST match exactly
        "rate": 8000,          // MUST be 8000
        "channels": 1          // MUST be 1
      }
    ]
  }
}
```

2. **Our Response (Must Match Exactly)**
```json
{
  "event": "start",
  "protocol": "wss",
  "version": "1.0.0",
  "streamSid": "MTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "tracks": [
    {
      "id": "inbound"  // MUST match incoming track id
    }
  ]
}
```

⚠️ **Critical Points**:
1. Track ID must be exactly "inbound"
2. All audio parameters must match
3. StreamSid must be echoed back
4. Response format must be exact

### 3. Media Messages

#### Audio Configuration
```typescript
interface AudioConfig {
  format: 'audio/x-mulaw';  // Only supported format
  sampleRate: 8000;         // Must be 8000 Hz
  channels: 1;              // Must be mono
  encoding: 'base64';       // Data encoding
}
```

#### Buffer Management
```typescript
class AudioBuffer {
  private maxSize = 1024 * 1024;  // 1MB limit
  private buffer: Buffer[] = [];
  
  addChunk(data: Buffer) {
    const totalSize = this.buffer.reduce((sum, b) => sum + b.length, 0);
    if (totalSize + data.length > this.maxSize) {
      this.flush();  // Prevent memory issues
    }
    this.buffer.push(data);
  }
  
  private flush() {
    // Process accumulated audio
    const audio = Buffer.concat(this.buffer);
    processAudio(audio);
    
    // Clear buffer
    this.buffer.forEach(b => b.fill(0));
    this.buffer = [];
  }
}
```

⚠️ **Common Issues**:
1. Buffer overflow
2. Format mismatch
3. Sample rate errors
4. Channel configuration

## Critical Issues and Solutions

### 1. Connection Management

#### Problem: Multiple Connections
```typescript
// WRONG: No connection management
wss.on('connection', (ws) => {
  handleConnection(ws);  // Multiple active connections!
});

// RIGHT: Single connection management
let currentCall: WebSocket | null = null;
wss.on('connection', (ws) => {
  if (currentCall) {
    console.log('🔄 Closing existing connection');
    currentCall.close();
  }
  currentCall = ws;
  handleConnection(ws);
});
```

#### Problem: Resource Leaks
```typescript
// WRONG: No cleanup
ws.on('close', () => {
  console.log('Connection closed');
});

// RIGHT: Proper cleanup
function cleanup() {
  if (currentCall) {
    currentCall.removeAllListeners();
    currentCall.close();
    currentCall = null;
  }
  if (audioBuffer) {
    audioBuffer.clear();
    audioBuffer = null;
  }
}
```

### 2. Protocol Handling

#### Problem: Message Validation
```typescript
// WRONG: Minimal validation
ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  handleMessage(msg);  // Dangerous!
});

// RIGHT: Strict validation
ws.on('message', (data) => {
  try {
    const raw = data.toString();
    console.log('📬 Raw message:', raw);
    
    const msg = JSON.parse(raw);
    validateMessage(msg);  // Throws if invalid
    
    handleMessage(msg);
  } catch (error) {
    console.error('❌ Message error:', error);
    cleanup();  // Always cleanup on error
  }
});
```

#### Problem: Track Configuration
```typescript
// WRONG: Assuming track config
function handleStart(msg) {
  const track = msg.start.tracks[0];  // Dangerous!
  startProcessing(track);
}

// RIGHT: Validate everything
function handleStart(msg) {
  if (!msg.start?.tracks?.[0]) {
    throw new Error('Invalid track config');
  }
  
  const track = msg.start.tracks[0];
  if (track.id !== 'inbound' ||
      track.format !== 'audio/x-mulaw' ||
      track.rate !== 8000 ||
      track.channels !== 1) {
    throw new Error('Invalid track parameters');
  }
  
  startProcessing(track);
}
```

### 3. Audio Processing

#### Problem: Buffer Management
```typescript
// WRONG: Unlimited buffer
let audioData = [];
ws.on('message', (data) => {
  audioData.push(data);  // Memory leak!
});

// RIGHT: Managed buffer
const MAX_BUFFER = 1024 * 1024;  // 1MB
let bufferSize = 0;
let audioData = [];

ws.on('message', (data) => {
  if (bufferSize + data.length > MAX_BUFFER) {
    processAudioBatch(audioData);
    audioData = [];
    bufferSize = 0;
  }
  
  audioData.push(data);
  bufferSize += data.length;
});
```

## Verification Checklist

### 1. Connection Setup
- [ ] Using WSS protocol
- [ ] Correct endpoint path
- [ ] Single connection management
- [ ] Proper error handling

### 2. Message Handling
- [ ] Start message validation
- [ ] Track configuration check
- [ ] Response format verification
- [ ] Error recovery process

### 3. Audio Processing
- [ ] Buffer size limits
- [ ] Format validation
- [ ] Memory management
- [ ] Resource cleanup

## Monitoring and Debugging

### 1. Connection Monitoring
```typescript
let connectionStats = {
  connected: false,
  startTime: null,
  messageCount: 0,
  errors: 0,
  lastError: null
};

ws.on('open', () => {
  connectionStats.connected = true;
  connectionStats.startTime = Date.now();
  console.log('🌟 Connection opened:', connectionStats);
});

ws.on('error', (error) => {
  connectionStats.errors++;
  connectionStats.lastError = error;
  console.error('❌ Connection error:', connectionStats);
});
```

### 2. Message Logging
```typescript
function logMessage(type: string, msg: any) {
  console.log(`📝 [${type}] Message:`, {
    timestamp: new Date().toISOString(),
    type: type,
    event: msg.event,
    streamSid: msg.streamSid,
    size: JSON.stringify(msg).length
  });
}
```

### 3. Performance Tracking
```typescript
const metrics = {
  messagesProcessed: 0,
  bytesProcessed: 0,
  errors: 0,
  lastProcessingTime: 0
};

function trackPerformance(fn: () => void) {
  const start = Date.now();
  try {
    fn();
    metrics.messagesProcessed++;
  } catch (error) {
    metrics.errors++;
    throw error;
  } finally {
    metrics.lastProcessingTime = Date.now() - start;
  }
}
```

## Best Practices

### 1. Connection Management
```typescript
// Proper WebSocket connection handling
ws.on('open', () => {
  console.log('🌟 [Call] WebSocket connection opened');
});

ws.on('close', () => {
  console.log('🔴 [Call] WebSocket connection closed');
});

ws.on('error', (error) => {
  console.error('❌ [Call] WebSocket error:', error);
});
```

### 2. Message Logging
```typescript
ws.on('message', (data: Buffer) => {
  try {
    const rawMessage = data.toString();
    console.log('📬 [Call] Raw message received:', rawMessage);
    const msg = JSON.parse(rawMessage);
    console.log('📥 [Call] Parsed message:', msg);
  } catch (error) {
    console.error('❌ [Call] Error handling message:', error);
  }
});
```

### 3. Track Management
- Maintain single active connection per call
- Close existing connections before accepting new ones
- Validate track IDs match between request and response

## Verification Steps

1. Check WebSocket Connection:
   ```bash
   # Monitor ngrok logs for connection upgrade
   19:06:58.926 +22 GET /call 101 Switching Protocols
   ```

2. Verify Protocol Messages:
   - Watch for start message from Twilio
   - Confirm response sent with correct format
   - Monitor for media messages

3. Validate Audio Stream:
   - Check format parameters match
   - Verify track IDs are consistent
   - Monitor for data flow

## Known Limitations

1. Single Connection:
   - Only one active WebSocket connection per call
   - New connections replace existing ones

2. Protocol Requirements:
   - Must use WSS protocol
   - Must respond to start message promptly
   - Must match track IDs exactly

3. Audio Format:
   - Limited to mulaw format
   - Fixed sample rate and channel count
   - No support for other audio formats
