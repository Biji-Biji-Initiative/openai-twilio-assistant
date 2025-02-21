# Security Considerations

## Critical Learnings

### 1. Environment Security

```plaintext
# Critical: Keep credentials in correct .env files

/Twilio
├── webapp/.env               # Only Twilio credentials
│   ├── TWILIO_ACCOUNT_SID
│   ├── TWILIO_AUTH_TOKEN
│   ├── TWILIO_PHONE_NUMBER
│   └── TWILIO_OUTBOUND_NUMBER
└── websocket-server/.env     # Only OpenAI and ngrok
    ├── OPENAI_API_KEY
    └── NGROK_DOMAIN
```

### 2. Required Credentials

```env
# Twilio Credentials (in webapp/.env)
TWILIO_ACCOUNT_SID=ACab6a3b51e6078865e1e39e8005dc2bcd
TWILIO_AUTH_TOKEN=eb6c2c6ed99fec1d5190fc95b4815c37
TWILIO_PHONE_NUMBER=60393880467
TWILIO_OUTBOUND_NUMBER=+60393880542

# OpenAI and Ngrok (in websocket-server/.env)
OPENAI_API_KEY=sk-proj-BkEytEYvZvtiYSsVYfAjR7AAAWP6SJbR...
NGROK_DOMAIN=mereka.ngrok.io
```

### 3. Connection Management

```typescript
// In server.ts
wss.on('connection', (ws: WebSocket, req: Request) => {
  // Extract path for connection type
  const path = req.url?.split('/')?.[1];
  
  // Validate connection type
  if (path === 'call') {
    console.log('📞 Handling call connection');
    if (currentCall) {
      console.log('🔄 Closing existing call connection');
      currentCall.close();
    }
    currentCall = ws;
    handleCallConnection(currentCall);
  } else if (path === 'logs') {
    console.log('📝 Handling logs connection');
    if (currentLogs) {
      console.log('🔄 Closing existing logs connection');
      currentLogs.close();
    }
    currentLogs = ws;
    handleFrontendConnection(currentLogs);
  } else {
    console.error('❌ Unknown connection type');
    ws.close();
  }
});
```

### 4. URL Security

```typescript
// In server.ts - TwiML generation
app.all("/twiml", (req, res) => {
  const wsUrl = new URL(PUBLIC_URL);
  wsUrl.protocol = "wss:";
  wsUrl.pathname = "/call";
  
  // Ensure we're using the fixed domain
  if (wsUrl.hostname !== 'mereka.ngrok.io') {
    console.error('❌ Invalid domain:', wsUrl.hostname);
    res.status(500).send('Invalid domain');
    return;
  }
  
  const twimlContent = twimlTemplate.replace("{{WS_URL}}", wsUrl.toString());
  res.type("text/xml").send(twimlContent);
});
```

## Security Rules

### 1. Environment Rules
- Keep Twilio credentials in webapp/.env
- Keep OpenAI key in websocket-server/.env
- Never modify existing variables
- Use exact values as specified

### 2. Connection Rules
- Only one active call connection
- Only one active logs connection
- Always use wss:// protocol
- Always use mereka.ngrok.io domain

### 3. Phone Number Rules
- Inbound: 60393880467 (users call this)
- Outbound: +60393880542 (AI uses this)
- Validate numbers match exactly
- Keep numbers in correct format

### 4. Resource Rules
- Close existing connections before new ones
- Clean up resources after disconnection
- Monitor connection states
- Log security-relevant events

## Implementation Details

### 1. WebSocket Handling
```typescript
// In server.ts
const wss = new WebSocket.Server({ server });

// Track active connections
let currentCall: WebSocket | null = null;
let currentLogs: WebSocket | null = null;

// Handle disconnections
function handleDisconnect(ws: WebSocket) {
  if (ws === currentCall) {
    console.log('📞❌ Call connection closed');
    currentCall = null;
  } else if (ws === currentLogs) {
    console.log('📝❌ Logs connection closed');
    currentLogs = null;
  }
}

// Clean up on process exit
process.on('SIGTERM', () => {
  console.log('🔄 Cleaning up connections');
  if (currentCall) currentCall.close();
  if (currentLogs) currentLogs.close();
});
```

### 2. TwiML Security
```typescript
// In server.ts
const twimlTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="{{WS_URL}}"/>
  </Connect>
</Response>`;

// Validate incoming Twilio requests
app.use('/twiml', (req, res, next) => {
  const twilioSignature = req.headers['x-twilio-signature'];
  if (!twilioSignature) {
    console.error('❌ Missing Twilio signature');
    res.status(401).send('Unauthorized');
    return;
  }
  next();
});
```

### 3. Error Handling
```typescript
// In server.ts
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  // Clean up and exit
  if (currentCall) currentCall.close();
  if (currentLogs) currentLogs.close();
  process.exit(1);
});
```
interface SecurityCheck {
  category: string;
  check: () => Promise<boolean>;
  severity: 'high' | 'medium' | 'low';
}

const DAILY_CHECKS: SecurityCheck[] = [
  {
    category: 'Credentials',
    check: async () => {
      // Check environment variables
      const requiredVars = {
        webapp: [
          'TWILIO_ACCOUNT_SID',
          'TWILIO_AUTH_TOKEN',
          'TWILIO_PHONE_NUMBER',
          'TWILIO_OUTBOUND_NUMBER'
        ],
        websocketServer: [
          'OPENAI_API_KEY',
          'NGROK_DOMAIN',
          'NGROK_AUTH_TOKEN'
        ]
      };
      
      // Verify all required vars exist
      return Object.entries(requiredVars).every(
        ([_, vars]) => vars.every(v => process.env[v])
      );
    },
    severity: 'high'
  },
  {
    category: 'Connections',
    check: async () => {
      // Check active connections
      const activeConns = getActiveConnections();
      return activeConns.length <= 1; // Only one allowed
    },
    severity: 'high'
  },
  {
    category: 'Protocol',
    check: async () => {
      // Verify all URLs use secure protocols
      const urls = getAllConfiguredUrls();
      return urls.every(url => 
        url.startsWith('https://') || 
        url.startsWith('wss://')
      );
    },
    severity: 'high'
  }
];
```

### 2. Security Monitoring
```typescript
// 1. Connection Monitoring
interface ConnectionStats {
  ip: string;
  connectTime: number;
  messageCount: number;
  lastActive: number;
  errors: number;
}

class ConnectionMonitor {
  private connections = new Map<string, ConnectionStats>();
  
  addConnection(id: string, ip: string) {
    this.connections.set(id, {
      ip,
      connectTime: Date.now(),
      messageCount: 0,
      lastActive: Date.now(),
      errors: 0
    });
  }
  
  recordActivity(id: string) {
    const conn = this.connections.get(id);
    if (conn) {
      conn.messageCount++;
      conn.lastActive = Date.now();
      
      // Check for suspicious activity
      const messageRate = conn.messageCount / 
        ((Date.now() - conn.connectTime) / 1000);
      
      if (messageRate > 100) { // > 100 msgs/sec
        this.recordError(id);
        return false;
      }
    }
    return true;
  }
  
  recordError(id: string) {
    const conn = this.connections.get(id);
    if (conn) {
      conn.errors++;
      if (conn.errors > 5) {
        return false; // Too many errors
      }
    }
    return true;
  }
}

// 2. Resource Monitoring
interface ResourceUsage {
  memory: NodeJS.MemoryUsage;
  connections: number;
  messageRate: number;
  errors: number;
}

class ResourceMonitor {
  private usage: ResourceUsage[] = [];
  
  recordUsage() {
    this.usage.push({
      memory: process.memoryUsage(),
      connections: getActiveConnections().length,
      messageRate: calculateMessageRate(),
      errors: getErrorCount()
    });
    
    // Keep last hour of data
    if (this.usage.length > 360) { // 1 hour at 10s intervals
      this.usage.shift();
    }
  }
  
  checkThresholds(): boolean {
    const latest = this.usage[this.usage.length - 1];
    
    return (
      latest.memory.heapUsed < 500 * 1024 * 1024 && // 500MB
      latest.connections <= 1 &&
      latest.messageRate < 100 &&
      latest.errors < 10
    );
  }
}
```

### 3. Security Audit Log
```typescript
// 1. Audit Event Types
type AuditEventType =
  | 'connection_attempt'
  | 'authentication_failure'
  | 'message_received'
  | 'message_sent'
  | 'error_occurred'
  | 'resource_cleanup';

// 2. Audit Event Structure
interface AuditEvent {
  type: AuditEventType;
  timestamp: number;
  success: boolean;
  details: {
    ip?: string;
    endpoint?: string;
    error?: string;
    resourceType?: string;
  };
}

// 3. Audit Logger
class SecurityAuditLog {
  private events: AuditEvent[] = [];
  
  log(event: AuditEvent) {
    this.events.push(event);
    
    // Log to external system
    console.log('Security Audit:', {
      type: event.type,
      timestamp: new Date(event.timestamp).toISOString(),
      success: event.success,
      // Mask sensitive data
      details: {
        ...event.details,
        ip: event.details.ip?.replace(/\d/g, '*')
      }
    });
  }
  
  getRecentEvents(minutes: number): AuditEvent[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.events.filter(e => e.timestamp >= cutoff);
  }
  
  analyzePatterns(): void {
    const recentEvents = this.getRecentEvents(15);
    
    // Check for suspicious patterns
    const failedAuths = recentEvents.filter(
      e => e.type === 'authentication_failure'
    ).length;
    
    if (failedAuths > 10) {
      console.warn('High number of auth failures detected');
    }
    
    // Other pattern analysis...
  }
}
```
### 4. Error Handling & Input Validation
```typescript
// 1. Input Validation
class InputValidator {
  static validatePhoneNumber(number: string): boolean {
    return [
      '60393880467',    // Inbound
      '+60393880542'    // Outbound
    ].includes(number);
  }
  
  static validateDomain(url: string): boolean {
    return new URL(url).hostname === 'mereka.ngrok.io';
  }
  
  static validateProtocol(url: string): boolean {
    const protocol = new URL(url).protocol;
    return protocol === 'https:' || protocol === 'wss:';
  }
}

// 2. Error Boundaries
class ErrorBoundary {
  static handle(error: Error): void {
    // Log error safely
    console.error('Security Error:', {
      name: error.name,
      message: error.message,
      // Don't log stack in production
      stack: process.env.NODE_ENV === 'development' 
        ? error.stack 
        : undefined
    });
    
    // Cleanup resources
    cleanupResources();
  }
}

// 3. Resource Cleanup
function cleanupResources(): void {
  // Clear sensitive data
  if (currentConnection) {
    currentConnection.removeAllListeners();
    currentConnection.close();
    currentConnection = null;
  }
  
  // Clear buffers
  audioBuffers.forEach(buffer => buffer.fill(0));
  audioBuffers = [];
  
  // Reset state
  currentCallSid = null;
  isProcessing = false;
}
```

### 5. Security Checklist Summary

#### Daily Checks
- [ ] Verify all environment variables are set correctly
- [ ] Check for unauthorized connection attempts
- [ ] Monitor error logs for security issues
- [ ] Verify resource cleanup is working
- [ ] Check connection states and limits

#### Weekly Checks
- [ ] Review security audit logs
- [ ] Analyze connection patterns
- [ ] Check resource usage trends
- [ ] Verify protocol compliance
- [ ] Test error handling

#### Monthly Checks
- [ ] Review all security configurations
- [ ] Check for dependency updates
- [ ] Validate all credentials
- [ ] Test resource cleanup
- [ ] Update security documentation

## Additional Security Considerations

### 1. Protocol Security
- Always use WSS protocol
- Validate all connections
- Monitor connection patterns
- Enforce rate limits

### 2. Data Security
- Clear sensitive data immediately
- Use secure protocols only
- Validate all inputs
- Monitor resource usage

### 3. Audit Requirements
- Log all security events
- Monitor connection patterns
- Track resource usage
- Regular security reviews



