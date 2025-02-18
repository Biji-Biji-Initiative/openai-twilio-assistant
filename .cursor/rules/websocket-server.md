# WebSocket Server Architecture

## Overview
The WebSocket server is a critical component of the Twilio integration, handling real-time communication between the frontend and Twilio services. It manages call status updates, session management, and event broadcasting.

## Key Components

### 1. Server Setup (`src/server.ts`)
- Express server with WebSocket support
- CORS configuration for secure communication
- API routes for Twilio webhooks
- Error handling middleware

### 2. Session Management (`src/services/session-service.ts`)
- Manages WebSocket client sessions
- Handles session cleanup and timeouts
- Tracks active calls and client connections
- Provides methods for broadcasting messages

### 3. Event Handling (`src/handlers/`)
- `event-handler.ts`: WebSocket message processing
- `request-handler.ts`: HTTP/Twilio webhook handling
- Supports call initiation and status updates

### 4. Environment Configuration (`src/config/environment.ts`)
Required environment variables:
- `PORT`: Server port (default: 8081)
- `TWILIO_ACCOUNT_SID`: Twilio account identifier
- `TWILIO_AUTH_TOKEN`: Twilio authentication token
- `TWILIO_PHONE_NUMBER`: Assigned Twilio phone number
- `PUBLIC_URL`: Public ngrok URL for webhooks

## WebSocket Protocol

### Message Types
1. Call Status Updates:
```typescript
{
  type: 'call.status',
  callSid: string,
  status: 'initiating' | 'ringing' | 'in-progress' | 'completed' | 'failed',
  duration?: number
}
```

2. Call Actions:
```typescript
{
  type: 'call.action',
  action: 'disconnect',
  callSid: string
}
```

### Error Handling
- Operational errors use the `AppError` class
- Unexpected errors are logged and reported to clients
- All errors include timestamps and context

## Best Practices
1. **Session Management**
   - Always clean up sessions on disconnect
   - Use the session service for client tracking
   - Maintain session activity timestamps

2. **Error Handling**
   - Use the error handler middleware
   - Log all errors with context
   - Send appropriate error responses

3. **WebSocket Communication**
   - Validate all incoming messages
   - Handle connection errors gracefully
   - Use typed message interfaces

4. **Environment**
   - Validate all required variables
   - Use secure values in production
   - Log startup configuration

## Common Issues
1. **Connection Errors**
   - Check ngrok tunnel status
   - Verify WebSocket URL configuration
   - Ensure proper CORS settings

2. **Call Handling**
   - Verify Twilio credentials
   - Check webhook URL configuration
   - Monitor call status updates

3. **Session Management**
   - Monitor session cleanup
   - Check for memory leaks
   - Verify client disconnection handling

## Testing
1. **Unit Tests**
   - Test all service methods
   - Verify error handling
   - Check message formatting

2. **Integration Tests**
   - Test WebSocket connections
   - Verify Twilio webhook handling
   - Check session management

3. **End-to-End Tests**
   - Test complete call flow
   - Verify status updates
   - Check error scenarios 