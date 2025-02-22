# OpenAI-Twilio Integration Learnings

## Model Configuration

### Model Selection
- Current model: `gpt-4o-realtime-preview-2024-12-17`
- Model must be specified in two places:
  1. WebSocket connection URL: `wss://api.openai.com/v1/audio/speech/realtime/gpt-4o-realtime-preview-2024-12-17`
  2. Session configuration: `model` field in the session creation payload

### Session Configuration
```typescript
{
  model: "gpt-4o-realtime-preview-2024-12-17",
  modalities: ["text", "audio"],
  instructions: "...",
  voice: "alloy",
  turn_detection: {
    type: "server_vad",
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 200,
    create_response: true
  },
  input_audio_format: "g711_ulaw",
  output_audio_format: "g711_ulaw",
  input_audio_transcription: {
    model: "whisper-1",
    language: null,
    prompt: null
  }
}
```

## Audio Stream Events

### Key Events to Monitor
1. `session.created`: Initial session creation with model and configuration
2. `session.updated`: Updates to session configuration (e.g., audio format)
3. `input_audio_buffer.speech_started`: Indicates speech detection
4. `media`: Contains actual audio data payload
5. `model_response` or `model_event`: Contains OpenAI's responses

### Event Flow
1. Call initiated → TwiML starts media stream
2. WebSocket connection established
3. Session created with initial configuration
4. Session updated with audio format settings
5. Speech detection begins
6. Audio data flows through media events
7. Model responds with text/audio

## Testing Protocol

### Test Script Components
1. WebSocket Connection:
   - Connect to `/logs` endpoint
   - Monitor all events
   - Handle connection errors

2. Call Management:
   - Initiate test call via Twilio API
   - Use test-specific TwiML
   - Monitor call status events

3. Audio Validation:
   - Wait for stream start
   - Verify audio data reception
   - Check for OpenAI responses

### Common Issues and Solutions
1. Audio Format Mismatch:
   - Ensure `g711_ulaw` format in session config
   - Match Twilio's 8000Hz sample rate
   - Single channel audio only

2. Timeout Issues:
   - Default 30-second timeout for responses
   - Increase timeout for testing if needed
   - Monitor all event types for debugging

3. Model Connection:
   - Verify model name exactly matches
   - Check API key permissions
   - Monitor connection events

## Best Practices

### Configuration Management
1. Keep model name in a single configuration location
2. Use environment variables for API keys
3. Maintain consistent audio format settings

### Error Handling
1. Monitor WebSocket connection state
2. Log all events during testing
3. Implement proper cleanup on disconnection

### Testing
1. Use dedicated test TwiML for validation
2. Monitor both Twilio and OpenAI events
3. Save test results for debugging

## Validation Checklist

### Pre-Test
- [ ] WebSocket server running
- [ ] Valid OpenAI API key
- [ ] Correct model name
- [ ] Test TwiML configured

### During Test
- [ ] Session created successfully
- [ ] Audio format configured
- [ ] Speech detection working
- [ ] Media events flowing
- [ ] Model responses received

### Post-Test
- [ ] Clean disconnection
- [ ] Logs saved
- [ ] Results analyzed
- [ ] Resources cleaned up
