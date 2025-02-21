# Implementation Patterns

## Code Organization

### 1. Project Structure
```plaintext
/Twilio
├── webapp/                    # Next.js frontend
│   ├── app/
│   │   ├── page.tsx          # Main page
│   │   └── api/
│   │       └── call/
│   │           └── route.ts   # Call API
│   ├── components/
│   │   ├── CallInterface.tsx  # Call UI
│   │   ├── MainTabs.tsx      # Tab manager
│   │   └── ChecklistAndConfig.tsx
│   └── .env                  # Twilio config
└── websocket-server/         # WebSocket server
    ├── src/
    │   ├── server.ts         # Main server
    │   ├── functionHandlers.ts# OpenAI functions
    │   └── twiml.xml         # Call config
    └── .env                  # OpenAI & ngrok
```

### 2. Core Components

#### CallInterface Component
```typescript
// Real implementation from CallInterface.tsx
const CallInterface = ({ 
  allConfigsReady, 
  setAllConfigsReady 
}: CallInterfaceProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [callStatus, setCallStatus] = useState("disconnected");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState("");
  const [currentCallSid, setCurrentCallSid] = useState<string | null>(null);
  
  // The number we're calling from (Twilio outbound number)
  const fromNumber = process.env.TWILIO_OUTBOUND_NUMBER || "+60393880542";
  
  // The number users call to reach the AI (Twilio inbound number)
  const inboundNumber = process.env.TWILIO_INBOUND_NUMBER || "60393880467";

  // Initialize WebSocket when configs are ready
  useEffect(() => {
    if (allConfigsReady && !ws && wsStatus === 'disconnected') {
      console.log('[WebSocket] Configs ready, initiating connection');
      connectWebSocket();
    }
  }, [allConfigsReady, ws, wsStatus]);
};
```

#### WebSocket Server
```typescript
// Real implementation from server.ts
wss.on('connection', (ws: WebSocket, req: Request) => {
  const path = req.url?.split('/')?.[1];
  
  if (!path) {
    console.error('❌ Missing path in connection request');
    ws.close();
    return;
  }
  
  if (path === 'call') {
    if (currentCall) {
      console.log('🔄 Closing existing call connection');
      currentCall.close();
    }
    currentCall = ws;
    handleCallConnection(currentCall);
  } else if (path === 'logs') {
    if (currentLogs) {
      console.log('🔄 Closing existing logs connection');
      currentLogs.close();
    }
    currentLogs = ws;
    handleFrontendConnection(currentLogs);
  } else {
    console.error('❌ Unknown connection type:', path);
    ws.close();
  }
});
```

### 3. State Management

#### Connection State Flow
```typescript
// In CallInterface.tsx
const connectWebSocket = () => {
  // Prevent multiple connections
  if (wsStatus === 'connecting' || wsStatus === 'connected') {
    console.log('[WebSocket] Connection already in progress');
    return;
  }

  console.log('[WebSocket] Initiating connection...');
  setWsStatus('connecting');
  setError(null);

  try {
    const ngrokDomain = process.env.NEXT_PUBLIC_NGROK_DOMAIN || 'mereka.ngrok.io';
    const newWs = new WebSocket(`wss://${ngrokDomain}/logs`);

    newWs.onopen = () => {
      console.log("[WebSocket] Connection established");
      setWsStatus('connected');
      setError(null);
      setWs(newWs);
    };

    newWs.onclose = () => {
      console.log("[WebSocket] Connection closed");
      setWsStatus('disconnected');
      setWs(null);
    };
  } catch (error) {
    console.error('[WebSocket] Connection error:', error);
    setError('Failed to connect to WebSocket');
    setWsStatus('disconnected');
  }
};
```

#### Configuration Management
```typescript
// In ChecklistAndConfig.tsx
export const ChecklistAndConfig = ({ 
  setSelectedPhoneNumber, 
  setAllConfigsReady 
}: ChecklistAndConfigProps) => {
  const [checks, setChecks] = useState({
    twilioSid: false,
    twilioToken: false,
    twilioNumber: false,
    openaiKey: false,
    ngrokDomain: false
  });

  useEffect(() => {
    const allComplete = Object.values(checks).every(v => v);
    if (allComplete) {
      setAllConfigsReady(true);
    }
  }, [checks, setAllConfigsReady]);

  return (
    <div className="flex flex-col gap-2">
      <h2>Configuration Checklist</h2>
      {Object.entries(checks).map(([key, value]) => (
        <div key={key}>
          <input
            type="checkbox"
            checked={value}
            onChange={e => setChecks(c => ({ 
              ...c, 
              [key]: e.target.checked 
            }))}
          />
          <label>{key}</label>
        </div>
      ))}
    </div>
  );
};

const [callState, setCallState] = useState<CallState>({
  status: 'initiated',
  callSid: null,
  timestamp: null
});
```

## Error Handling

### 1. WebSocket Errors
```typescript
ws.on('error', (error: Error) => {
  console.error('❌ [Call] WebSocket error:', error);
  cleanup();
  reconnect();
});

function cleanup() {
  if (currentCall) {
    currentCall.close();
    currentCall = null;
  }
}

function reconnect() {
  // Implement exponential backoff
  setTimeout(connect, backoffTime);
}
```

### 2. Protocol Errors
```typescript
function handleMessage(data: Buffer) {
  try {
    const msg = JSON.parse(data.toString());
    validateMessage(msg);
    processMessage(msg);
  } catch (error) {
    console.error('❌ Message handling error:', error);
    logError(error);
  }
}

function validateMessage(msg: any) {
  if (!msg.event) throw new Error('Missing event type');
  if (msg.event === 'start' && !msg.streamSid) {
    throw new Error('Missing streamSid in start message');
  }
}
```

## Connection Management

### 1. Resource Cleanup
```typescript
function handleClose() {
  console.log('🔴 Connection closed');
  cleanup();
}

function cleanup() {
  if (currentCall) {
    currentCall.removeAllListeners();
    currentCall.close();
    currentCall = null;
  }
  if (currentLogs) {
    currentLogs.removeAllListeners();
    currentLogs.close();
    currentLogs = null;
  }
}
```

### 2. Connection Lifecycle
```typescript
class ConnectionManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private backoffTime = 1000;

  connect() {
    this.cleanup();
    this.ws = new WebSocket(WS_URL);
    this.setupListeners();
  }

  private setupListeners() {
    if (!this.ws) return;
    
    this.ws.on('open', this.handleOpen);
    this.ws.on('message', this.handleMessage);
    this.ws.on('close', this.handleClose);
    this.ws.on('error', this.handleError);
  }

  private cleanup() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
  }
}
```

## Best Practices

### 1. Code Organization
- Separate concerns (connection, message handling, state)
- Use TypeScript for type safety
- Implement proper error boundaries
- Follow consistent naming conventions

### 2. State Management
- Single source of truth
- Immutable state updates
- Clear state transitions
- Proper cleanup on unmount

### 3. Error Handling
- Comprehensive error catching
- Detailed error logging
- Graceful degradation
- Recovery mechanisms

### 4. Connection Management
- Resource cleanup
- Connection monitoring
- Reconnection strategies
- State synchronization

### 5. Testing
- Unit tests for handlers
- Integration tests for flow
- Error case coverage
- State transition testing
