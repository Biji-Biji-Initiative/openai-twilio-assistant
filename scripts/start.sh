#!/bin/bash

# Enable error handling
set -e

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -i :"$port" > /dev/null 2>&1; then
        echo "Port $port is already in use"
        return 1
    fi
    return 0
}

# Function to wait for a service to be ready
wait_for_service() {
    local port=$1
    local service=$2
    local max_attempts=30
    local attempt=1

    echo "Waiting for $service to be ready on port $port..."
    while ! curl -s "http://localhost:$port" > /dev/null 2>&1; do
        if [ $attempt -gt $max_attempts ]; then
            echo "$service failed to start after $max_attempts attempts"
            return 1
        fi
        echo "Attempt $attempt: $service not ready yet..."
        sleep 1
        ((attempt++))
    done
    echo "$service is ready!"
    return 0
}

# Function for thorough cleanup
cleanup() {
    echo "Cleaning up processes..."
    cd "$(dirname "$0")"
    
    # Kill processes by port
    lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    lsof -ti :8081 | xargs kill -9 2>/dev/null || true
    
    # Kill any lingering node processes from our directories
    pkill -f "node.*webapp" || true
    pkill -f "node.*websocket-server" || true
    
    # Kill ngrok
    pkill -f "ngrok" || true
    
    # Kill specific PIDs if they exist
    [[ ! -z "$WEBAPP_PID" ]] && kill -9 $WEBAPP_PID 2>/dev/null || true
    [[ ! -z "$WS_PID" ]] && kill -9 $WS_PID 2>/dev/null || true
    [[ ! -z "$NGROK_PID" ]] && kill -9 $NGROK_PID 2>/dev/null || true
    
    # Small delay to ensure processes are cleaned up
    sleep 2

    # Verify ports are free
    check_port 3000 || echo "Warning: Port 3000 still in use after cleanup"
    check_port 8081 || echo "Warning: Port 8081 still in use after cleanup"
}

# Function to create/update webapp .env
create_webapp_env() {
    echo "Creating/updating webapp/.env file..."
    local env_file="$SCRIPT_DIR/webapp/.env"
    cat > "$env_file" << EOL
# Twilio Credentials
TWILIO_ACCOUNT_SID=ACab6a3b51e6078865e1e39e8005dc2bcd
TWILIO_AUTH_TOKEN=783607c12b78f3d08a581379d775118b

# Phone Numbers
TWILIO_INBOUND_NUMBER=60393880467
TWILIO_OUTBOUND_NUMBER=+60393880542

# Ngrok Configuration
NGROK_DOMAIN=mereka.ngrok.io
EOL

    # Verify env file was created
    if [ ! -f "$env_file" ]; then
        echo "Error: Failed to create webapp .env file"
        return 1
    fi
}

# Function to create/update websocket-server .env
create_websocket_env() {
    echo "Creating/updating websocket-server/.env file..."
    local env_file="$SCRIPT_DIR/websocket-server/.env"
    cat > "$env_file" << EOL
# OpenAI Configuration
OPENAI_API_KEY=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

# Ngrok Configuration
PUBLIC_URL=https://mereka.ngrok.io
NGROK_AUTH_TOKEN=2sy7rzIlzrNhrpsYw151gKDIXcy_3aPfJJCdxwkyJ19KF9XnF
EOL

    # Verify env file was created
    if [ ! -f "$env_file" ]; then
        echo "Error: Failed to create websocket-server .env file"
        return 1
    fi
}

# Function to install dependencies
install_deps() {
    local dir=$1
    echo "Installing dependencies in $dir..."
    cd "$dir"
    if [ ! -f "package.json" ]; then
        echo "Error: No package.json found in $dir"
        return 1
    fi

    echo "Running npm install in $dir..."
    if ! npm install; then
        echo "Error: npm install failed in $dir"
        return 1
    fi

    echo "Verifying node_modules..."
    if [ ! -d "node_modules" ]; then
        echo "Error: node_modules directory not created in $dir"
        return 1
    fi
}

main() {
    # Set up cleanup on script exit
    trap cleanup EXIT INT TERM

    # Initial cleanup
    cleanup

    # Get the script directory
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

    echo "=== Starting Twilio Demo Setup ==="

    # Check if ports are available
    echo "Checking ports..."
    check_port 3000 || { echo "Error: Port 3000 is in use"; exit 1; }
    check_port 8081 || { echo "Error: Port 8081 is in use"; exit 1; }

    # Create .env files
    echo "Setting up environment files..."
    create_webapp_env || exit 1
    create_websocket_env || exit 1

    # Install dependencies
    echo "Setting up dependencies..."
    install_deps "$SCRIPT_DIR/webapp" || exit 1
    install_deps "$SCRIPT_DIR/websocket-server" || exit 1

    # Start the webapp
    echo "Starting webapp..."
    cd "$SCRIPT_DIR/webapp"
    npm run dev -- -p 3000 &
    WEBAPP_PID=$!

    # Wait for webapp to be ready
    wait_for_service 3000 "webapp" || {
        echo "Error: Webapp failed to start"
        exit 1
    }

    # Start the websocket server
    echo "Starting websocket server..."
    cd "$SCRIPT_DIR/websocket-server"
    PORT=8081 npm run dev &
    WS_PID=$!

    # Wait for websocket server to be ready
    wait_for_service 8081 "websocket server" || {
        echo "Error: WebSocket server failed to start"
        exit 1
    }

    # Start ngrok using config file
    echo "Starting ngrok..."
    cd "$SCRIPT_DIR"
    ngrok start --config ./ngrok.yml --all &
    NGROK_PID=$!

    # Wait a bit for ngrok to establish tunnels
    sleep 5

    echo "=== Setup Complete ==="
    echo "Webapp running on http://localhost:3000"
    echo "WebSocket server running on http://localhost:8081"
    echo "Ngrok tunnel running at https://mereka.ngrok.io"

    # Keep script running
    wait
}

# Run main function
main

# Set up cleanup on script termination
trap cleanup EXIT INT TERM

# Keep script running and show status
echo "All services started!"
echo "Press Ctrl+C to stop all services"
