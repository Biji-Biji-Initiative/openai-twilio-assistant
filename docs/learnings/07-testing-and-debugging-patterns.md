# Testing and Debugging Patterns

## Common Issues and Solutions

### 1. Connection State Management

#### Problem Areas
- WebSocket connections not properly closed before new attempts
- Ngrok restarts breaking existing connections
- Multiple parallel connection attempts
- Lost state during testing cycles

#### Solution Pattern
```bash
# 1. Clean State Check
./start.sh check-state

# 2. Single Connection Flow
./start.sh connect-all

# Expected Output:
# ✓ Ngrok running on mereka.ngrok.io
# ✓ WebSocket server ready
# ✓ Frontend connected
```

### 2. Test Preparation Checklist

Before ANY test run:
1. **Environment State**
   - [ ] All previous WebSocket connections closed
   - [ ] Ngrok running on mereka.ngrok.io
   - [ ] No zombie processes from previous tests

2. **Configuration Check**
   - [ ] Twilio webhooks point to mereka.ngrok.io
   - [ ] Environment variables loaded
   - [ ] TwiML configuration valid

3. **Service Order**
   ```plaintext
   1. Ngrok (must be first, stable domain required)
   2. WebSocket Server
   3. Frontend
   4. Test Scripts
   ```

### 3. Efficient Testing Pattern

```typescript
// test-connection.ts
async function testConnection() {
  // 1. Single WebSocket Connection
  const ws = await connectWebSocket({
    maxRetries: 0,  // No retries, fail fast
    timeout: 5000   // 5s timeout
  });

  // 2. Validate TwiML
  const twiml = await validateTwiML();
  
  // 3. Test Call Flow
  const result = await testCallFlow({
    ws,
    twiml,
    number: "+60393880542"
  });

  return result;
}
```

### 4. Common Mistakes to Avoid

1. **Connection Management**
   - ❌ Multiple parallel connection attempts
   - ❌ Not closing old connections
   - ✓ Single connection, proper cleanup

2. **Testing Flow**
   - ❌ Random test order
   - ❌ Skipping prerequisites
   - ✓ Following strict order: Ngrok → WS → Frontend → Tests

3. **State Tracking**
   - ❌ Assuming previous state
   - ❌ Not validating current state
   - ✓ Explicit state checks before each step

### 5. Debug Logging Pattern

```typescript
// Consistent logging format
const log = {
  state: (msg: string) => console.log(`[State] ${msg}`),
  conn: (msg: string) => console.log(`[Conn] ${msg}`),
  call: (msg: string) => console.log(`[Call] ${msg}`),
  error: (msg: string) => console.error(`[Error] ${msg}`)
};

// Usage
log.state("Checking configuration...");
log.conn("WebSocket connected");
log.call("Outbound call initiated");
log.error("Connection timeout");
```

## Test Script Implementation

### 1. Connection Test Script
```bash
#!/bin/bash

# test-connection.sh
check_ngrok() {
  curl -s https://mereka.ngrok.io/health || exit 1
}

check_websocket() {
  nc -z localhost 8081 || exit 1
}

check_frontend() {
  nc -z localhost 3000 || exit 1
}

main() {
  echo "1. Checking Ngrok..."
  check_ngrok
  
  echo "2. Checking WebSocket..."
  check_websocket
  
  echo "3. Checking Frontend..."
  check_frontend
  
  echo "✓ All services running"
}

main
```

### 2. Call Flow Test
```typescript
// test-call-flow.ts
async function testCallFlow() {
  // 1. Validate Environment
  const config = await validateEnvironment();
  if (!config.valid) {
    throw new Error(`Invalid config: ${config.errors.join(", ")}`);
  }

  // 2. Test WebSocket
  const ws = await testWebSocket();
  if (!ws.connected) {
    throw new Error("WebSocket connection failed");
  }

  // 3. Test Call
  const call = await testCall();
  return call.status;
}
```

## Improvement Areas

1. **Automated Testing**
   - Add automated health checks
   - Implement connection retry with backoff
   - Add state validation between steps

2. **Monitoring**
   - Add WebSocket heartbeat
   - Monitor Ngrok connection status
   - Track call quality metrics

3. **Error Recovery**
   - Implement automatic cleanup
   - Add service recovery procedures
   - Improve error reporting

## Success State Checklist

### 1. Connection Success
- [ ] Ngrok running on mereka.ngrok.io
- [ ] WebSocket server accepting connections
- [ ] Frontend connected to WebSocket
- [ ] TwiML endpoint responding

### 2. Call Success
- [ ] Outbound calls connecting
- [ ] Audio streaming working
- [ ] AI responses received
- [ ] Call termination clean

### 3. Error Handling
- [ ] Connection errors logged
- [ ] Call failures recorded
- [ ] State recovery working
- [ ] Cleanup successful

## Usage Guide

1. **Initial Setup**
   ```bash
   # Run connection test
   ./test-connection.sh
   
   # Validate TwiML
   ./validate-twiml.sh
   ```

2. **Testing Calls**
   ```bash
   # Test outbound call
   ./test-call.sh outbound +60393880542
   
   # Test inbound call
   ./test-call.sh inbound 60393880467
   ```

3. **Debugging**
   ```bash
   # Check service status
   ./check-services.sh
   
   # View logs
   ./view-logs.sh
   ```
