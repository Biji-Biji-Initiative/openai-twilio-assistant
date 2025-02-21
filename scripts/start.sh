#!/bin/bash

# Source shared utilities
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SOURCE_DIR/utils.sh"

# Enable error handling
set -euo pipefail

# Initialize PID variables
WEBAPP_PID=""
WS_PID=""
NGROK_PID=""

# Cleanup function
cleanup() {
    log_info "Cleaning up processes..."
    
    # Kill specific PIDs if they exist
    [[ ! -z "$WEBAPP_PID" ]] && kill -9 $WEBAPP_PID 2>/dev/null || true
    [[ ! -z "$WS_PID" ]] && kill -9 $WS_PID 2>/dev/null || true
    [[ ! -z "$NGROK_PID" ]] && kill -9 $NGROK_PID 2>/dev/null || true
    
    # Small delay to ensure processes are cleaned up
    sleep 2

    # Verify ports are free
    check_port 3000 || log_warning "Port 3000 still in use after cleanup"
    check_port 8081 || log_warning "Port 8081 still in use after cleanup"

    log_info "Cleanup complete"
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

    # Move to project root
    cd "$SOURCE_DIR/.."
    
    log_info "=== Starting Twilio Demo Setup ==="

    # Initial cleanup and checks
    cleanup
    check_dependencies || exit 1
    
    # Check ports
    check_port $WEBAPP_PORT "Webapp" || exit 1
    check_port $WEBSOCKET_PORT "WebSocket Server" || exit 1

    # Create .env files
    log_info "Setting up environment files..."
    create_webapp_env || exit 1
    create_websocket_env || exit 1

    # Install dependencies
    log_info "Setting up dependencies..."
    install_deps "webapp" || exit 1
    install_deps "websocket-server" || exit 1

    # Start ngrok
    log_info "Starting ngrok..."
    ngrok start --config ./ngrok.yml --all > /dev/null &
    NGROK_PID=$!
    check_ngrok || exit 1

    # Start the websocket server
    log_info "Starting websocket server..."
    cd websocket-server
    PORT=$WEBSOCKET_PORT npm run dev > /dev/null 2>&1 &
    WS_PID=$!
    cd ..
    wait_for_service $WEBSOCKET_PORT "WebSocket server" || exit 1

    # Start the webapp
    log_info "Starting webapp..."
    cd webapp
    npm run dev -- -p $WEBAPP_PORT > /dev/null 2>&1 &
    WEBAPP_PID=$!
    cd ..
    wait_for_service $WEBAPP_PORT "Webapp" || exit 1

    # Final status
    log_success "=== Setup Complete ==="
    log_info "Webapp running on http://localhost:$WEBAPP_PORT"
    log_info "WebSocket server running on http://localhost:$WEBSOCKET_PORT"
    log_info "Ngrok running on http://localhost:$NGROK_PORT"
    log_info "Public URL: https://mereka.ngrok.io"
    log_info "Press Ctrl+C to stop all services"

    # Wait for any child process to exit
    wait
}

# Run main function
main
