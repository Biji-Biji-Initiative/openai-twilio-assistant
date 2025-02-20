#!/bin/bash

# Function to check if a port is in use
check_port() {
    lsof -i :$1 >/dev/null 2>&1
    return $?
}

# Function to kill process on a port
kill_port() {
    lsof -ti :$1 | xargs kill -9 2>/dev/null || true
}

# Kill any existing processes on our ports
echo "Cleaning up existing processes..."
kill_port 3000
kill_port 8081

# Check if .env exists, if not create it
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOL
PORT=3000
WEBSOCKET_PORT=8081
NGROK_DOMAIN=mereka.ngrok.io

# Twilio Credentials
TWILIO_ACCOUNT_SID=AC7f7746b4d2f8c9d3a3f3f3f3f3f3f3f3
TWILIO_AUTH_TOKEN=eb6c2c6ed99fec1d5190fc95b4815c37
TWILIO_PHONE_NUMBER=+60393880542
EOL
fi

# Start the webapp
echo "Starting webapp..."
cd webapp
npm run dev &
WEBAPP_PID=$!

# Start the websocket server
echo "Starting websocket server..."
cd ../websocket-server
npm run dev &
WS_PID=$!

# Start ngrok
echo "Starting ngrok..."
cd ..
ngrok http 8081 --domain=mereka.ngrok.io &
NGROK_PID=$!

# Function to cleanup processes on script exit
cleanup() {
    echo "Cleaning up processes..."
    kill $WEBAPP_PID 2>/dev/null
    kill $WS_PID 2>/dev/null
    kill $NGROK_PID 2>/dev/null
    exit
}

# Set up cleanup on script termination
trap cleanup EXIT INT TERM

# Keep script running and show status
echo "All services started!"
echo "- Webapp: http://localhost:3000"
echo "- Websocket: ws://localhost:8081"
echo "- Ngrok: https://mereka.ngrok.io"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for any process to exit
wait
