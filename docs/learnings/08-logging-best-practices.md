# Logging Best Practices

## Real Implementation Lessons

### Key Issues We Encountered

1. **Lost Connection Context**
   - Couldn't track which WebSocket was for calls vs logs
   - No way to correlate frontend and backend logs
   - Missing timestamps made debugging sequence issues impossible

2. **Overwhelmed by Media Logs**
   - Logged every audio packet, flooding the console
   - Couldn't see important events among media noise
   - Missed critical state changes

3. **Missing Critical State**
   - No logging of Ngrok domain status
   - Lost track of Twilio webhook configurations
   - Couldn't verify TwiML endpoint state

### Real Implementation Examples

#### 1. WebSocket Server Issues
```typescript
// What we had (problematic)
wss.on('connection', (ws: WebSocket) => {
  console.log('Connected'); // ❌ No context
});

// What we evolved to
wss.on('connection', (ws: WebSocket, req: Request) => {
  const path = req.url?.split('/')?.[1];
  console.log(`📞 [${path}] New connection request`);
  console.log('📋 [Call] Connection headers:', req.headers);
});

1. **Connection State Changes**
   ```typescript
   // ❌ What we did wrong:
   console.log("WebSocket connected");
   
   // ✓ What we should have done:
   console.log('[WebSocket] Connection established at 2025-02-21T09:44:43Z');
   console.log('[WebSocket] Connection headers:', req.headers);
   ```

2. **Media Handling**
   ```typescript
   // ❌ What we did wrong - logging every packet:
   console.log('[Media] Received packet:', data);
   
   // ✓ What we should have done:
   // Only log first packet and state changes
   if (!session.lastMediaHandled) {
     console.log('🔄 [Twilio] First media packet received, initiating model connection...');
   }
   ```

3. **Error Context**
   ```typescript
   // ❌ What we did wrong:
   console.error('Connection failed');
   
   // ✓ What we should have done:
   console.error('❌ [Call] WebSocket error:', {
     type: error.type,
     timestamp: new Date().toISOString(),
     connectionState: ws.readyState
   });
   ```

### Actual Logging Categories We Need

#### 1. Connection State (Critical)
```typescript
// In server.ts
ws.on('connection', (ws: WebSocket, req: Request) => {
  const path = req.url?.split('/')?.[1];
  if (path === 'call') {
    console.log('📞 [Call] New connection request');
    console.log('📋 [Call] Connection headers:', req.headers);
  }
});

// In sessionManager.ts
function handleTwilioMessage(data: RawData) {
  if (!session.modelConn && !session.lastMediaHandled) {
    console.log('🔄 [Twilio] First media packet, connecting model...');
  }
}
```

#### 2. Media Flow (Selective)
```typescript
// In sessionManager.ts
function handleModelMessage(data: RawData) {
  const event = parseMessage(data) as ModelMessage | null;
  // Only log non-audio events to reduce noise
  if (!event.type.includes('audio')) {
    console.log('[Model] Event:', event.type);
  }
}
```

1. **Connection Lifecycle**
   ```typescript
   // Connection attempts
   console.log('📞 [Call] New connection request');
   
   // State changes
   console.log('🌟 [Call] WebSocket connection opened');
   console.log('🔴 [Call] WebSocket connection closed');
   
   // Cleanup
   console.log('🔄 [Call] Closing existing connection');
   ```

2. **Call Flow**
   ```typescript
   // Call initiation
   console.log('📞 [Call] Initiating call to:', number);
   
   // Media flow
   if (!session.modelConn && !session.lastMediaHandled) {
     console.log('🔄 [Twilio] First media packet received');
   }
   
   // Call termination
   console.log('🔴 [Call] Call ended, SID:', callSid);
   ```

3. **Model Interactions**
   ```typescript
   // Non-audio events only
   if (!event.type.includes('audio')) {
     console.log('[Model] Event:', event.type);
   }
   ```

### Specific Mistakes We Made

1. **Connection Management**
   ```typescript
   // ❌ Bad: No cleanup logging
   if (currentCall) {
     currentCall.close();
   }

   // ✓ Good: Added in server.ts
   if (currentCall) {
     console.log('🔄 [Call] Closing existing connection');
     currentCall.close();
   }
   ```

2. **Error Handling**
   ```typescript
   // ❌ Bad: Generic errors
   ws.on('error', (error) => {
     console.error('Error:', error);
   });

   // ✓ Good: Added context
   ws.on('error', (error) => {
     console.error('❌ [Call] WebSocket error:', error);
   });
   ```

3. **State Tracking**
   ```typescript
   // ❌ Bad: Missing state transitions
   setWsStatus('connected');

   // ✓ Good: Added in CallInterface
   console.log(`[WebSocket] Status change: ${prevStatus} -> connected`);
   setWsStatus('connected');
   ```

1. **Excessive Logging**
   - Logged every WebSocket message
   - Logged all media packets
   - Logged redundant connection attempts

2. **Missing Context**
   - No timestamps on critical events
   - No connection state information
   - No call SID in logs

3. **Inconsistent Formats**
   - Mixed logging styles
   - Inconsistent prefixes
   - Missing error contexts

### Required Logging Points

1. **Connection Lifecycle**
   ```typescript
   // Must log these events:
   - WebSocket connection attempts (server.ts)
   - Connection state changes (CallInterface.tsx)
   - Connection closures (both sides)
   - Cleanup operations
   ```

2. **Call Flow**
   ```typescript
   // Critical points to log:
   - Call SID assignment
   - First media packet
   - Model connection status
   - Call termination
   ```

3. **Configuration**
   ```typescript
   // Must verify:
   - Ngrok domain status
   - TwiML endpoint configuration
   - Webhook URL setup
   - Environment variables
   ```

```typescript
// Consistent logging format we evolved to:
const log = {
  call: (msg: string, data?: any) => 
    console.log(`📞 [Call] ${msg}`, data || ''),
  
  ws: (msg: string, data?: any) => 
    console.log(`🔌 [WebSocket] ${msg}`, data || ''),
  
  model: (msg: string, data?: any) => 
    console.log(`🤖 [Model] ${msg}`, data || ''),
  
  error: (msg: string, error?: any) => 
    console.error(`❌ [Error] ${msg}`, error || '')
};

// Usage examples from our code:
log.call('New connection request', { headers: req.headers });
log.ws('Connection established', { timestamp: new Date().toISOString() });
log.model('Processing response');
log.error('Connection failed', error);
```

### 5. Critical Information to Log

1. **Connection Events**
   - WebSocket connection attempts
   - Connection state changes
   - Connection closures
   - Headers for Twilio connections

2. **Call Flow**
   - Call SID
   - First media packet
   - Model connection status
   - Call termination reason

3. **Error States**
   - Connection failures
   - Media processing errors
   - Model errors
   - Call failures

### 6. Recommendations for Future

1. **Structured Logging**
   ```typescript
   // Add structured logging with levels
   interface LogEntry {
     timestamp: string;
     level: 'info' | 'warn' | 'error';
     category: 'call' | 'ws' | 'model';
     message: string;
     data?: any;
   }
   ```

2. **Log Aggregation**
   - Implement log collection
   - Add log rotation
   - Include request IDs
   - Track call session logs

3. **Monitoring Improvements**
   - Add WebSocket heartbeat logging
   - Track media packet statistics
   - Monitor call quality metrics
   - Log performance metrics

## Implementation Guide

### 1. Logger Setup
```typescript
// Recommended logger implementation
const logger = {
  info: (category: string, msg: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] [${category}] ${msg}`, data || '');
  },
  
  error: (category: string, msg: string, error?: any) => {
    console.error(`[${new Date().toISOString()}] [${category}] ${msg}`, error || '');
  },
  
  debug: (category: string, msg: string, data?: any) => {
    if (process.env.DEBUG) {
      console.debug(`[${new Date().toISOString()}] [${category}] ${msg}`, data || '');
    }
  }
};
```

### 2. Usage in Components
```typescript
// In CallInterface.tsx
logger.info('call', 'Initiating connection');
logger.error('ws', 'Connection failed', error);

// In WebSocket server
logger.info('model', 'Processing response');
logger.debug('media', 'Packet received', { timestamp });
```

### 3. Log Categories
- `call`: Call-related events
- `ws`: WebSocket connections
- `model`: AI model interactions
- `media`: Media processing
- `config`: Configuration changes
- `error`: Error conditions
