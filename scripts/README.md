# Twilio OpenAI Integration Scripts

This directory contains utility scripts and modules for managing, testing, and debugging the Twilio-OpenAI integration. Each component is designed with modularity, maintainability, and reliability in mind.

## Overview

The codebase follows these core principles:

1. **DRY (Don't Repeat Yourself)**: Common functionality is abstracted into shared utilities
2. **Single Responsibility**: Each component has a clear, focused purpose
3. **Robust Error Handling**: Comprehensive error detection and recovery
4. **Consistent Logging**: Standardized logging across all components
5. **Configuration Management**: Centralized, type-safe configuration

## Architecture

### Shell Scripts
- Orchestrate service startup and management
- Handle process lifecycle and cleanup
- Provide different modes (production, basic, debug)

### TypeScript Utilities
- Manage WebSocket connections
- Handle logging and error reporting
- Configure system parameters
- Validate external services

## Available Components

### System Scripts

1. **`start.sh`**
   - Main startup script for production
   - Full environment validation
   - Service orchestration and health checks
   - Process cleanup and signal handling
   - Run with: `./scripts/start.sh`

2. **`start-basic.sh`**
   - Minimal startup for development
   - Basic environment setup
   - Quick service startup
   - Run with: `./scripts/start-basic.sh`

3. **`debug.sh`**
   - Enhanced debugging capabilities
   - Verbose logging with timestamps
   - State inspection and validation
   - Service connection testing
   - Run with: `./scripts/debug.sh`

4. **`utils.sh`**
   - Shared shell script utilities
   - Environment management
   - Process control functions
   - Health check utilities
   - Used by other shell scripts

### TypeScript Utilities

1. **`utils/config.ts`**
   - Global configuration constants
   - Type-safe configuration values
   - Centralized parameter management
   - Environment-specific settings

2. **`utils/logger.ts`**
   - Structured logging system
   - Multiple log levels (INFO, SUCCESS, WARNING, ERROR)
   - File and console output
   - Timestamp and context tracking

3. **`utils/websocket.ts`**
   - WebSocket connection management
   - Automatic reconnection
   - Connection state tracking
   - Error handling and recovery

### Service Validation

1. **`connection.ts`**
   ```bash
   npm run validate
   ```
   - Validates external services
   - Tests WebSocket connections
   - Verifies API credentials
   - Checks ngrok tunnels

2. **`call-flow.ts`**
   ```bash
   npm run test:call
   ```
   - End-to-end call testing
   - Real-time monitoring
   - Performance tracking
   - Error detection

3. **`collect-logs.ts`**
   ```bash
   npm run logs:collect
   ```
   - Log aggregation and analysis
   - Structured log formatting
   - Automatic file rotation
   - Log level filtering

## Configuration Parameters

### Timeouts and Intervals
```typescript
timeouts: {
  websocketConnection: 5000,    // WebSocket connection timeout (ms)
  additionalLogs: 30000,        // Wait for additional logs (ms)
  serviceStartup: 30000,        // Service startup timeout (ms)
  ngrokTunnel: 10000,          // Ngrok tunnel timeout (ms)
  retryInterval: 1000          // Retry interval (ms)
}
```

### Retry Attempts
```typescript
maxRetries: {
  websocket: 3,    // WebSocket connection retries
  services: 5,     // Service startup retries
  ngrok: 5         // Ngrok tunnel retries
}
```

### Service Ports
```typescript
ports: {
  webapp: 3000,      // Web application
  websocket: 8081,    // WebSocket server
  ngrok: 4040        // Ngrok dashboard
}
```

## Common Workflows

### 1. Production Deployment
```bash
# 1. Start all services with full validation
./start.sh

# 2. Monitor logs
npm run logs:collect

# 3. Validate connections
npm run validate
```

### 2. Development Setup
```bash
# 1. Quick start for development
./start-basic.sh

# 2. Run tests
npm run test:call

# 3. Check logs
npm run logs:collect
```

### 3. Debugging Issues
```bash
# 1. Enable debug mode
./debug.sh

# 2. Validate connections
npm run validate

# 3. Monitor logs
npm run logs:collect
```

## Dependencies and Requirements

### System Requirements
- Node.js 16+
- TypeScript 5.x
- ngrok with fixed domain (mereka.ngrok.io)
- Bash shell environment

### Environment Files
1. **webapp/.env**
   ```env
   TWILIO_ACCOUNT_SID=ACab6a3b51e6078865e1e39e8005dc2bcd
   TWILIO_AUTH_TOKEN=783607c12b78f3d08a581379d775118b
   TWILIO_PHONE_NUMBER=60393880467
   TWILIO_AGENT_NUMBER=+60393880542
   ```

2. **websocket-server/.env**
   ```env
   OPENAI_API_KEY=sk-proj-wy63471m2lJpcv...
   NGROK_DOMAIN=mereka.ngrok.io
   NGROK_AUTH_TOKEN=2sy7rzIlzrNhrpsYw151gKDIXcy_3aPfJJCdxwkyJ19KF9XnF
   ```

### NPM Dependencies
```json
{
  "dependencies": {
    "@types/node": "^18.0.0",        // Node.js types
    "@types/ws": "^8.5.0",          // WebSocket types
    "axios": "^1.5.1",              // HTTP client
    "date-fns": "^2.30.0",          // Date utilities
    "dotenv": "^16.3.1",            // Environment loading
    "twilio": "^4.18.0",            // Twilio SDK
    "typescript": "^5.0.0",         // TypeScript compiler
    "ws": "^8.14.2"                 // WebSocket client
  }
}
```

## Best Practices

### Error Handling
1. **Comprehensive Error Capture**
   ```typescript
   try {
     await operation()
   } catch (error) {
     logger.error('Operation failed', error)
     // Suggest recovery steps
     logger.info('Try: 1. Check network connection\n2. Verify credentials')
   }
   ```

2. **Retry Mechanisms**
   ```typescript
   while (retries > 0) {
     try {
       await operation()
       break
     } catch (error) {
       retries--
       await delay(CONFIG.timeouts.retryInterval)
     }
   }
   ```

3. **Resource Cleanup**
   ```typescript
   let resource
   try {
     resource = await acquire()
     await use(resource)
   } finally {
     await resource?.release()
   }
   ```

### Logging Best Practices
1. **Use Appropriate Levels**
   ```typescript
   logger.info('Starting operation')     // Normal operation
   logger.success('Task completed')      // Successful completion
   logger.warning('Retrying task')      // Potential issues
   logger.error('Operation failed')      // Errors and failures
   ```

2. **Include Context**
   ```typescript
   logger.info(`Processing call ${callSid} for number ${phoneNumber}`)
   ```

3. **Structured Data**
   ```typescript
   logger.info('Call stats', {
     duration: callDuration,
     status: callStatus,
     timestamp: new Date().toISOString()
   })
   ```

### Testing Guidelines
1. **Component Testing**
   - Test each service independently
   - Verify external dependencies
   - Check error handling
   - Validate retry logic

2. **Integration Testing**
   - Test complete call flow
   - Verify WebSocket connections
   - Check environment setup
   - Monitor performance

3. **Documentation**
   - Record test scenarios
   - Document edge cases
   - Track known issues
   - Update troubleshooting guide

## Troubleshooting Guide

### Common Issues and Solutions

1. **Port Conflicts**
   ```bash
   Error: EADDRINUSE: address already in use :::3000
   ```
   Solution:
   ```bash
   # Find process using port
   lsof -i :3000
   
   # Kill process
   kill $(lsof -t -i:3000)
   ```

2. **WebSocket Connection Failures**
   ```bash
   Error: WebSocket connection timeout
   ```
   Solutions:
   - Check if WebSocket server is running
   - Verify port 8081 is available
   - Ensure no firewall blocking
   - Try increasing connection timeout

3. **Ngrok Tunnel Issues**
   ```bash
   Error: Failed to start ngrok tunnel
   ```
   Solutions:
   - Verify ngrok auth token
   - Check domain availability
   - Ensure port 4040 is free
   - Restart ngrok service

4. **Environment Variable Errors**
   ```bash
   Error: Missing required environment variable TWILIO_AUTH_TOKEN
   ```
   Solutions:
   - Check .env file locations
   - Verify variable names
   - Run start.sh to recreate
   - Check file permissions

### Diagnostic Commands

1. **Check Services**
   ```bash
   # List running processes
   ps aux | grep -E 'node|ngrok'
   
   # Check ports
   netstat -an | grep -E '3000|8081|4040'
   ```

2. **View Logs**
   ```bash
   # Recent logs
   tail -f logs/latest.log
   
   # Error logs
   grep ERROR logs/*.log
   ```

3. **Test Connections**
   ```bash
   # WebSocket
   curl -v ws://localhost:8081
   
   # Ngrok
   curl https://mereka.ngrok.io/health
   ```

### Recovery Procedures

1. **Complete Reset**
   ```bash
   # Stop all services
   pkill -f "node|ngrok"
   
   # Clear temporary files
   rm -rf .tmp/*
   
   # Recreate environment
   ./start.sh
   ```

2. **Safe Restart**
   ```bash
   # Graceful shutdown
   ./scripts/utils.sh cleanup
   
   # Start services
   ./start.sh
   ```

3. **Debug Mode**
   ```bash
   # Run with debug logging
   DEBUG=* ./debug.sh
   
   # Monitor output
   npm run logs:collect
   ```

## Further Resources

1. **Development Guides**
   - [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
   - [Shell Scripting Guide](https://google.github.io/styleguide/shellguide.html)
   - [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

2. **API Documentation**
   - [Twilio API Reference](https://www.twilio.com/docs/api)
   - [OpenAI API Guide](https://platform.openai.com/docs/api-reference)
   - [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

3. **Tools and Utilities**
   - [ngrok Documentation](https://ngrok.com/docs)
   - [ws: Node.js WebSocket](https://github.com/websockets/ws)
   - [date-fns Documentation](https://date-fns.org/docs/Getting-Started)

## Contributing

### Adding New Scripts
1. Follow the directory structure
2. Include comprehensive logging
3. Add retry logic
4. Document usage and dependencies

### Modifying Existing Scripts
1. Maintain backward compatibility
2. Update documentation
3. Test thoroughly
4. Follow error handling patterns
