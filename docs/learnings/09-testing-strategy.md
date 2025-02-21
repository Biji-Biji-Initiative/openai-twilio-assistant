# Testing Strategy

## Test Categories

### 1. Unit Tests

#### WebSocket Message Handling
```typescript
describe('WebSocket Message Handler', () => {
  test('should handle start message', () => {
    const message = {
      event: 'start',
      streamSid: 'MTxxxxx',
      start: {
        tracks: [{ id: 'inbound' }]
      }
    };
    
    const response = handleStartMessage(message);
    expect(response).toEqual({
      event: 'start',
      protocol: 'wss',
      version: '1.0.0',
      streamSid: 'MTxxxxx',
      tracks: [{ id: 'inbound' }]
    });
  });

  test('should handle invalid messages', () => {
    const message = { event: 'unknown' };
    expect(() => handleStartMessage(message)).toThrow();
  });
});
```

#### TwiML Generation
```typescript
describe('TwiML Generator', () => {
  test('should generate valid TwiML', () => {
    const wsUrl = 'wss://mereka.ngrok.io/call';
    const twiml = generateTwiML(wsUrl);
    
    expect(twiml).toContain('<Stream url="wss://mereka.ngrok.io/call">');
    expect(twiml).toContain('<Parameter name="track" value="inbound" />');
    expect(twiml).toContain('<Parameter name="format" value="audio/x-mulaw" />');
  });
});
```

### 2. Integration Tests

#### Call Flow Testing
```typescript
describe('Call Flow', () => {
  test('should handle complete call lifecycle', async () => {
    // Initialize test environment
    const server = new TestServer();
    const client = new TestClient();

    // Start call
    const call = await client.initiateCall({
      from: '+60393880542',
      to: '60393880467'
    });

    // Verify call states
    expect(call.status).toBe('initiated');
    await waitForStatus(call, 'ringing');
    await waitForStatus(call, 'in-progress');
    
    // Verify WebSocket connection
    const ws = await waitForWebSocket();
    expect(ws.readyState).toBe(WebSocket.OPEN);
    
    // Cleanup
    await call.disconnect();
    expect(call.status).toBe('completed');
  });
});
```

#### WebSocket Connection Testing
```typescript
describe('WebSocket Connection', () => {
  test('should establish and maintain connection', async () => {
    const ws = new WebSocket('wss://mereka.ngrok.io/call');
    
    await new Promise(resolve => ws.on('open', resolve));
    expect(ws.readyState).toBe(WebSocket.OPEN);
    
    // Send test message
    ws.send(JSON.stringify({
      event: 'start',
      streamSid: 'MTxxxxx'
    }));
    
    // Verify response
    const response = await waitForMessage(ws);
    expect(response.event).toBe('start');
    expect(response.protocol).toBe('wss');
  });
});
```

### 3. End-to-End Tests

#### Complete Call Scenario
```typescript
describe('End-to-End Call', () => {
  test('should complete full call cycle', async () => {
    // Start services
    await startServices();
    
    // Initialize Twilio client
    const twilio = new Twilio(ACCOUNT_SID, AUTH_TOKEN);
    
    // Make call
    const call = await twilio.calls.create({
      url: 'https://mereka.ngrok.io/twiml',
      to: '60393880467',
      from: '+60393880542'
    });
    
    // Verify call progression
    await verifyCallStatus(call, ['initiated', 'ringing', 'in-progress']);
    
    // Verify audio stream
    await verifyAudioStream(call);
    
    // End call
    await call.update({ status: 'completed' });
    
    // Verify cleanup
    await verifyConnectionClosed(call);
  });
});
```

## Test Environment Setup

### 1. Local Testing Environment
```typescript
class TestEnvironment {
  async setup() {
    // Set up test database
    this.db = await setupTestDB();
    
    // Start test server
    this.server = new TestServer({
      port: 8081,
      ssl: false
    });
    
    // Configure test credentials
    process.env.TWILIO_ACCOUNT_SID = 'test_sid';
    process.env.TWILIO_AUTH_TOKEN = 'test_token';
    
    // Start ngrok tunnel
    this.ngrok = await startTestTunnel(8081);
  }
  
  async teardown() {
    await this.server.stop();
    await this.ngrok.stop();
    await this.db.cleanup();
  }
}
```

### 2. Mock Services
```typescript
class MockTwilioService {
  async createCall(params) {
    return {
      sid: 'CAxxxxx',
      status: 'initiated',
      async update(status) {
        this.status = status;
        return this;
      }
    };
  }
}

class MockWebSocket {
  constructor() {
    this.messages = [];
    this.readyState = WebSocket.CONNECTING;
  }
  
  connect() {
    this.readyState = WebSocket.OPEN;
    this.emit('open');
  }
  
  send(message) {
    this.messages.push(message);
  }
}
```

## Validation Methods

### 1. Connection Validation
```typescript
async function validateConnection(ws: WebSocket) {
  // Check connection state
  expect(ws.readyState).toBe(WebSocket.OPEN);
  
  // Verify protocol
  const protocol = ws.protocol;
  expect(protocol).toBe('wss');
  
  // Test message exchange
  ws.send(testMessage);
  const response = await waitForMessage(ws);
  expect(response.event).toBe('start');
}
```

### 2. Audio Validation
```typescript
async function validateAudio(stream: MediaStream) {
  // Check format
  expect(stream.format).toBe('audio/x-mulaw');
  expect(stream.sampleRate).toBe(8000);
  expect(stream.channels).toBe(1);
  
  // Verify data flow
  const chunks = await collectAudioChunks(stream, 5000);
  expect(chunks.length).toBeGreaterThan(0);
  
  // Check quality metrics
  const metrics = analyzeAudioQuality(chunks);
  expect(metrics.packetsLost).toBeLessThan(0.01);
}
```

## Test Coverage Requirements

### 1. Code Coverage
- Minimum 80% overall coverage
- 100% coverage for critical paths
- Full coverage of error handlers
- Complete state transition coverage

### 2. Scenario Coverage
- All call states tested
- All error conditions verified
- Edge cases handled
- Performance scenarios included

### 3. Integration Coverage
- All external services tested
- All API endpoints covered
- WebSocket protocols verified
- Error recovery tested
