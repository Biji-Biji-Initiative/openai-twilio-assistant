# TwiML Configuration Guide

## Critical Learnings

### 🔥 Most Common Issues We Faced

1. **Track Parameter Mismatch**
   - SYMPTOM: Connection closes after start message
   - CAUSE: Track ID in TwiML doesn't match protocol
   - SOLUTION: Always use "inbound" as track ID

2. **Audio Format Issues**
   - SYMPTOM: No audio received
   - CAUSE: Missing or incorrect format parameters
   - SOLUTION: Include all format parameters exactly

3. **URL Protocol Problems**
   - SYMPTOM: Connection fails to upgrade
   - CAUSE: Wrong protocol in Stream URL
   - SOLUTION: Always use WSS protocol

## Core Configuration

### 🔑 Required Configuration
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <!-- Welcome message helps verify call connection -->
  <Say>Connected to AI assistant</Say>
  
  <Connect>
    <!-- CRITICAL: URL must use wss:// protocol -->
    <Stream url="{{WS_URL}}">
      <!-- ALL parameters are required and must match exactly -->
      <Parameter name="track" value="inbound" />
      <Parameter name="format" value="audio/x-mulaw" />
      <Parameter name="rate" value="8000" />
      <Parameter name="channels" value="1" />
    </Stream>
  </Connect>
  
  <!-- Disconnect message helps track call end -->
  <Say>Disconnected</Say>
</Response>
```

### ⚠️ Parameter Requirements

```typescript
interface TwiMLParameters {
  track: 'inbound';      // Must be exactly "inbound"
  format: 'audio/x-mulaw';// Only supported format
  rate: 8000;            // Must be 8000 Hz
  channels: 1;           // Must be mono
}
```

### 🔑 Critical Parameters

#### 1. Stream URL Configuration
```typescript
function generateTwiMLUrl(): string {
  const wsUrl = new URL(PUBLIC_URL);
  
  // CRITICAL: Must use these exact settings
  wsUrl.protocol = 'wss:';       // Only WSS works
  wsUrl.pathname = '/call';      // Must match server
  wsUrl.hostname = 'mereka.ngrok.io'; // Fixed domain
  
  return wsUrl.toString();
}
```

⚠️ **Validation Checklist**:
- [ ] Protocol is `wss://`
- [ ] Path is `/call`
- [ ] Domain is `mereka.ngrok.io`
- [ ] URL is publicly accessible

#### 2. Audio Configuration
```typescript
const REQUIRED_AUDIO_CONFIG = {
  format: 'audio/x-mulaw', // Only supported format
  rate: 8000,             // Must be exactly 8000
  channels: 1,            // Must be mono
  track: 'inbound'        // Must match protocol
} as const;  // Make immutable

function validateAudioConfig(config: typeof REQUIRED_AUDIO_CONFIG): boolean {
  return (
    config.format === REQUIRED_AUDIO_CONFIG.format &&
    config.rate === REQUIRED_AUDIO_CONFIG.rate &&
    config.channels === REQUIRED_AUDIO_CONFIG.channels &&
    config.track === REQUIRED_AUDIO_CONFIG.track
  );
}
```

⚠️ **Common Failures**:
1. Wrong format string (e.g., 'mulaw' instead of 'audio/x-mulaw')
2. Different sample rate
3. Stereo instead of mono
4. Custom track name

## Evolution of Configuration

### 📈 Learning Process

#### 1. Initial Attempts (Did Not Work)
```xml
<!-- DON'T DO THIS -->
<Stream url="{{WS_URL}}" track="inbound_track">
  <!-- These callbacks aren't needed for streaming -->
  <Parameter name="statusCallback" value="{{PUBLIC_URL}}/api/call/status"/>
  <Parameter name="statusCallbackEvent" value="initiated ringing answered completed"/>
  <Parameter name="statusCallbackMethod" value="POST"/>
</Stream>
```

❌ **Critical Issues**:
1. Track name must be "inbound"
2. Status callbacks don't affect streaming
3. Missing required audio parameters
4. Attribute-based track setting doesn't work

#### 2. Intermediate Attempt (Partial Success)
```xml
<!-- INCOMPLETE CONFIGURATION -->
<Stream url="{{WS_URL}}">
  <!-- This parameter is unnecessary -->
  <Parameter name="protocol" value="wss" />
</Stream>
```

❌ **Critical Issues**:
1. Protocol is set in URL, not parameter
2. Missing all audio parameters
3. No track configuration
4. Incomplete setup causes connection failure

#### 3. Final Working Version
```xml
<!-- CORRECT CONFIGURATION -->
<Stream url="wss://mereka.ngrok.io/call">
  <!-- ALL parameters are required -->
  <Parameter name="track" value="inbound" />
  <Parameter name="format" value="audio/x-mulaw" />
  <Parameter name="rate" value="8000" />
  <Parameter name="channels" value="1" />
</Stream>
```

✅ **Key Improvements**:
1. Complete parameter set
2. Correct parameter names
3. Exact value matching
4. Minimal configuration

### 📘 Configuration Rules

#### 1. Parameter Order
```xml
<Stream url="{{WS_URL}}">
  <!-- Track must be first -->
  <Parameter name="track" value="inbound" />
  
  <!-- Audio format second -->
  <Parameter name="format" value="audio/x-mulaw" />
  
  <!-- Rate and channels last -->
  <Parameter name="rate" value="8000" />
  <Parameter name="channels" value="1" />
</Stream>
```

#### 2. Value Formatting
```typescript
const PARAMETER_RULES = {
  track: {
    name: 'track',
    value: 'inbound',
    required: true,
    validation: (v: string) => v === 'inbound'
  },
  format: {
    name: 'format',
    value: 'audio/x-mulaw',
    required: true,
    validation: (v: string) => v === 'audio/x-mulaw'
  },
  rate: {
    name: 'rate',
    value: '8000',
    required: true,
    validation: (v: string) => parseInt(v) === 8000
  },
  channels: {
    name: 'channels',
    value: '1',
    required: true,
    validation: (v: string) => parseInt(v) === 1
  }
} as const;
```

## Common Pitfalls and Solutions

### 1. Track Naming Issues

#### Problem: Custom Track Names
```xml
<!-- WRONG: Custom track names -->
<Parameter name="track" value="inbound_track" />
<Parameter name="track" value="audio_in" />
<Parameter name="track" value="main" />

<!-- RIGHT: Only use "inbound" -->
<Parameter name="track" value="inbound" />
```

💡 **Why This Matters**:
- Track name must match protocol expectations
- Custom names cause immediate connection closure
- No negotiation or fallback available

### 2. Protocol Configuration

#### Problem: Protocol Parameters
```xml
<!-- WRONG: Protocol in parameters -->
<Stream url="{{WS_URL}}">
  <Parameter name="protocol" value="wss" />
</Stream>

<!-- RIGHT: Protocol in URL -->
<Stream url="wss://mereka.ngrok.io/call">
  <!-- No protocol parameter needed -->
</Stream>
```

💡 **Why This Matters**:
- Protocol must be in URL
- Parameter doesn't affect connection
- Can cause confusion in debugging

### 3. Audio Configuration

#### Problem: Format Specification
```xml
<!-- WRONG: Incomplete format -->
<Parameter name="format" value="mulaw" />

<!-- WRONG: Wrong format string -->
<Parameter name="format" value="audio/mulaw" />

<!-- RIGHT: Exact format string -->
<Parameter name="format" value="audio/x-mulaw" />
```

💡 **Why This Matters**:
- Format string must match exactly
- No format negotiation available
- Wrong format = no audio

### 4. URL Configuration

#### Problem: URL Formation
```typescript
// WRONG: Manual URL construction
const wsUrl = `${PUBLIC_URL}/call`;

// WRONG: Missing protocol change
const wsUrl = new URL('/call', PUBLIC_URL);

// RIGHT: Proper URL handling
function getWsUrl(): string {
  const wsUrl = new URL(PUBLIC_URL);
  wsUrl.protocol = 'wss:';
  wsUrl.pathname = '/call';
  return wsUrl.toString();
}
```

💡 **Why This Matters**:
- Protocol must be WSS
- Path must be exact
- Domain must be accessible

## Implementation Notes

### 1. URL Generation
```typescript
function generateTwiML(req: express.Request) {
  const wsUrl = new URL(PUBLIC_URL);
  wsUrl.protocol = "wss:";
  wsUrl.pathname = "/call";
  return twimlTemplate.replace("{{WS_URL}}", wsUrl.toString());
}
```

### 2. Error Handling
- Validate all required parameters
- Check URL accessibility
- Verify WebSocket endpoint
- Monitor connection status

### 3. Testing Strategy
1. Verify TwiML generation
2. Test WebSocket connection
3. Validate audio parameters
4. Check track configuration

## Verification Process

### 1. TwiML Response
```bash
curl http://localhost:8081/twiml
```
- Check content type is text/xml
- Verify all parameters present
- Validate URL format

### 2. WebSocket URL
- Must be publicly accessible
- Must use WSS protocol
- Must resolve to correct endpoint

### 3. Audio Configuration
- Verify format matches Twilio requirements
- Check sample rate is correct
- Confirm channel count

## Known Limitations

1. URL Requirements:
   - Must be public HTTPS/WSS
   - Must be stable (no temporary URLs)
   - Must handle WebSocket upgrade

2. Audio Format:
   - Fixed to mulaw
   - No format negotiation
   - Single channel only

3. Parameter Constraints:
   - Track name must be "inbound"
   - Sample rate must be 8000
   - No custom parameters supported
