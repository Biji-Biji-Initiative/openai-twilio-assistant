#!/bin/bash

# Basic startup script for Twilio demo project
set -e

# Configuration
WEBAPP_PORT=3000
WEBSOCKET_PORT=8081
NGROK_DOMAIN="mereka.ngrok.io"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Function for cleanup
cleanup() {
    echo "Cleaning up processes..."
    
    # Kill processes by port
    lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    lsof -ti :8081 | xargs kill -9 2>/dev/null || true
    
    # Kill ngrok
    pkill -f "ngrok" || true
    
    # Small delay to ensure processes are cleaned up
    sleep 1
}

# Function to create webapp .env
create_webapp_env() {
    echo "Creating/updating webapp/.env file..."
    cat > "webapp/.env" << EOL
# Twilio Credentials
TWILIO_ACCOUNT_SID=ACab6a3b51e6078865e1e39e8005dc2bcd
TWILIO_AUTH_TOKEN=783607c12b78f3d08a581379d775118b

# Phone Numbers
TWILIO_INBOUND_NUMBER=60393880467
TWILIO_OUTBOUND_NUMBER=+60393880542
EOL
}

# Function to create websocket-server .env
create_websocket_env() {
    echo "Creating/updating websocket-server/.env file..."
    cat > "websocket-server/.env" << EOL
# OpenAI Configuration
OPENAI_API_KEY=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

# Ngrok Configuration
PUBLIC_URL=https://mereka.ngrok.io
NGROK_AUTH_TOKEN=2sy7rzIlzrNhrpsYw151gKDIXcy_3aPfJJCdxwkyJ19KF9XnF
EOL
}

# Set up cleanup on script exit
trap cleanup EXIT INT TERM

# Initial cleanup
cleanup

# Create/update env files
create_webapp_env
create_websocket_env

# Start services
echo "Starting services..."

# Start ngrok
echo "Starting ngrok..."
ngrok http 8081 --domain=mereka.ngrok.io > /dev/null 2>&1 &
sleep 2

# Start websocket server
echo "Starting websocket server..."
cd websocket-server
npm run dev > /dev/null 2>&1 &
cd ..
sleep 2

# Start webapp
echo "Starting webapp..."
cd webapp
npm run dev > /dev/null 2>&1 &
cd ..

echo -e "${GREEN}All services started!${NC}"
echo "✓ Webapp: http://localhost:3000"
echo "✓ WebSocket: ws://localhost:8081"
echo "✓ Ngrok: https://mereka.ngrok.io"
echo -e "\nPress Ctrl+C to stop all services"

# Wait for interrupt
wait
