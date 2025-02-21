# Twilio OpenAI Integration Scripts

This directory contains utility scripts for managing, testing, and debugging the Twilio-OpenAI integration. Each script serves a specific purpose while maintaining simplicity and ease of use.

## Overview

All scripts for the Twilio-OpenAI integration are contained in this directory. Each script is designed to be:

1. **Independent**: Can be run standalone
2. **Simple**: Flat file structure, clear purpose
3. **Focused**: Each script does one thing well
4. **Reliable**: Includes error handling and logging

## Available Scripts

### System Scripts

1. **`start.sh`**
   - Main startup script
   - Full environment validation
   - Service orchestration
   - Run with: `./scripts/start.sh`

2. **`start-basic.sh`**
   - Minimal startup script
   - Quick development setup
   - Basic validation only
   - Run with: `./scripts/start-basic.sh`

3. **`debug.sh`**
   - Enhanced debugging
   - Verbose logging
   - State inspection
   - Run with: `./scripts/debug.sh`

### Utility Scripts

### 4. `connection.ts`
```bash
npm run validate
```
- **Purpose**: Validates all external service connections
- **Features**:
  - WebSocket connection testing
  - Twilio credential verification
  - OpenAI API validation
  - Ngrok tunnel checking
- **When to use**: Before development or when experiencing connection issues

### 5. `call-flow.ts`
```bash
npm run test:call
```
- **Purpose**: End-to-end call flow testing
- **Features**:
  - Complete call simulation
  - Real-time monitoring
  - Detailed logging
  - Error detection
- **When to use**: When testing call functionality or debugging call issues

### 6. `collect-logs.ts`
```bash
npm run logs:collect
```
- **Purpose**: Comprehensive log collection and analysis
- **Features**:
  - Real-time WebSocket logs
  - System log aggregation
  - Structured log format
  - Automatic log rotation
- **When to use**: During testing or when investigating issues

### Supporting Files

- `package.json`: Script dependencies
- `README.md`: This documentation

## Common Workflows

### 1. System Startup
```bash
# Full startup with validation
./start.sh

# Quick startup for development
./start-basic.sh
```

### 2. Connection Validation
```bash
# Check all connections
cd scripts
npm run validate

# Monitor connections
npm run logs:collect
```

### 3. Call Testing
```bash
# Test call flow
npm run test:call

# Collect test logs
npm run logs:collect
```

### 4. Debugging
```bash
# Enable debug mode
./debug.sh

# Run targeted tests
npm run test:call

# Collect debug logs
npm run logs:collect
```

## Dependencies

### System Requirements
- Node.js 16+
- TypeScript 5.x
- ngrok with fixed domain (mereka.ngrok.io)

### Environment Setup
- `webapp/.env`: Twilio credentials
- `websocket-server/.env`: OpenAI and ngrok config
- Valid Twilio phone numbers configured

### NPM Packages
```json
{
  "dependencies": {
    "axios": "^1.5.1",    // HTTP client
    "dotenv": "^16.3.1", // Environment loading
    "twilio": "^4.18.0", // Twilio SDK
    "ws": "^8.14.2"      // WebSocket client
  }
}
```

## Best Practices

### 1. Script Usage
- Use `start.sh` as the primary entry point
- Run validation before any testing
- Keep logs for all test runs
- Follow the testing workflow

### 2. Error Handling
- Check logs for error context
- Use retry mechanisms
- Document error patterns
- Maintain error history

### 3. Testing
- Validate connections first
- Test one component at a time
- Save test artifacts
- Document test results

### 4. Monitoring
- Collect logs consistently
- Use structured logging
- Monitor all endpoints
- Track performance metrics

## Troubleshooting Guide

### Connection Issues
1. Run validation:
   ```bash
   npm run validate
   ```
2. Check specific components:
   - Ngrok tunnel status
   - WebSocket endpoints
   - Twilio webhook URLs

### Call Flow Issues
1. Test call flow:
   ```bash
   npm run test:call
   ```
2. Verify:
   - Twilio credentials
   - Phone number configuration
   - WebSocket connections

### Logging Issues
1. Check log collection:
   ```bash
   npm run logs:collect
   ```
2. Verify:
   - Disk space
   - File permissions
   - Service status

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
