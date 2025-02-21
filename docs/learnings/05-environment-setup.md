# Environment Setup Guide

## Prerequisites

### 1. Required Software
- Node.js (v18+)
- npm or yarn
- ngrok
- Git

### 2. Access Credentials
```plaintext
1. Twilio Account:
   - Account SID: ACab6a3b51e6078865e1e39e8005dc2bcd
   - Auth Token: eb6c2c6ed99fec1d5190fc95b4815c37
   - Inbound Number: 60393880467
   - Outbound Number: +60393880542

2. OpenAI Account:
   - API Key: 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

3. Ngrok:
   - Domain: mereka.ngrok.io
   - Auth Token: 2sy7rzIlzrNhrpsYw151gKDIXcy_3aPfJJCdxwkyJ19KF9XnF
```

## Project Setup

### 1. Directory Structure
```plaintext
/Twilio
├── webapp/                 # Next.js frontend
│   ├── .env               # Twilio credentials
│   ├── package.json
│   └── app/
├── websocket-server/      # WebSocket handling
│   ├── .env              # OpenAI & ngrok config
│   ├── package.json
│   └── src/
└── start.sh              # Startup script
```

### 2. Environment Files

#### webapp/.env
```env
TWILIO_ACCOUNT_SID=ACab6a3b51e6078865e1e39e8005dc2bcd
TWILIO_AUTH_TOKEN=eb6c2c6ed99fec1d5190fc95b4815c37
TWILIO_PHONE_NUMBER=60393880467
TWILIO_OUTBOUND_NUMBER=+60393880542
```

#### websocket-server/.env
```env
OPENAI_API_KEY=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
PUBLIC_URL=https://mereka.ngrok.io
```

## Installation Steps

### 1. Clone Repository
```bash
git clone <repository-url>
cd Twilio
```

### 2. Install Dependencies
```bash
# Install webapp dependencies
cd webapp
npm install

# Install WebSocket server dependencies
cd ../websocket-server
npm install
```

### 3. Configure Ngrok
```bash
# Install ngrok
npm install -g ngrok

# Configure auth token
ngrok authtoken 2sy7rzIlzrNhrpsYw151gKDIXcy_3aPfJJCdxwkyJ19KF9XnF

# Configure domain
ngrok http --domain=mereka.ngrok.io 8081
```

## Twilio Configuration

### 1. Phone Number Setup

#### Inbound Number (60393880467)
1. Log into Twilio Console
2. Navigate to Phone Numbers
3. Configure webhook URL:
   ```
   Voice Configuration:
   - Webhook URL: https://mereka.ngrok.io/twiml
   - HTTP Method: POST
   ```

#### Outbound Number (+60393880542)
1. Configure in webapp/.env
2. Verify number is active
3. Test outbound calling

### 2. TwiML Configuration
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://mereka.ngrok.io/call">
      <Parameter name="track" value="inbound" />
      <Parameter name="format" value="audio/x-mulaw" />
      <Parameter name="rate" value="8000" />
      <Parameter name="channels" value="1" />
    </Stream>
  </Connect>
</Response>
```

## Starting the Application

### 1. Start Script
```bash
#!/bin/bash

# start.sh
echo "Starting Twilio Integration..."

# Start ngrok
echo "Starting ngrok..."
ngrok http --domain=mereka.ngrok.io 8081 &

# Wait for ngrok
sleep 5

# Start WebSocket server
echo "Starting WebSocket server..."
cd websocket-server
npm run dev &

# Start webapp
echo "Starting webapp..."
cd ../webapp
npm run dev
```

### 2. Manual Start
```bash
# Terminal 1: Start ngrok
ngrok http --domain=mereka.ngrok.io 8081

# Terminal 2: Start WebSocket server
cd websocket-server
npm run dev

# Terminal 3: Start webapp
cd webapp
npm run dev
```

## Verification Steps

### 1. Check Services
```bash
# Check ngrok
curl https://mereka.ngrok.io/twiml

# Check WebSocket server
curl http://localhost:8081/twiml

# Check webapp
curl http://localhost:3000/api/health
```

### 2. Test Call Flow
1. Make inbound call to 60393880467
2. Check WebSocket connection
3. Verify audio stream
4. Test AI response

## Troubleshooting

### 1. Connection Issues
```bash
# Check ngrok status
ngrok http --domain=mereka.ngrok.io 8081

# Verify ports
lsof -i :8081
lsof -i :3000

# Check logs
tail -f websocket-server/logs/server.log
```

### 2. Environment Issues
```bash
# Verify env files
cat webapp/.env
cat websocket-server/.env

# Check node versions
node -v
npm -v

# Check dependencies
npm list
```

## Maintenance

### 1. Logging
- WebSocket server logs: `websocket-server/logs/`
- Ngrok inspection: `http://localhost:4040`
- Webapp logs: Browser console

### 2. Updates
- Keep dependencies updated
- Monitor Twilio console
- Check ngrok status
- Update OpenAI key if needed
