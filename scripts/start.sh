#!/bin/bash

# Source shared utilities
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_DIR="$(cd "$SOURCE_DIR/.." && pwd)"
source "$SOURCE_DIR/utils.sh"

# Enable error handling
set -euo pipefail

# Initialize PID variables
WEBAPP_PID=""
WS_PID=""
NGROK_PID=""

# Cleanup is now handled by utils.sh

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
    cd "$SCRIPT_DIR/$dir"
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
    # Set up error handling
    trap 'echo "Error on line $LINENO"; exit 1' ERR
    trap cleanup EXIT INT TERM

    # Move to project root
    cd "$SOURCE_DIR/.."
    
    log_info "=== Starting Twilio Demo Setup ==="

    # Initial cleanup and checks
    if ! cleanup; then
        log_error "Cleanup failed"
        exit 1
    fi
    check_dependencies || exit 1
    
    # Check all required ports
    check_port $WEBAPP_PORT "Webapp" || exit 1
    check_port $WEBSOCKET_PORT "WebSocket Server" || exit 1
    check_port $NGROK_PORT "Ngrok" || exit 1

    # Create env files
    log_info "Setting up environment files..."
    create_webapp_env || exit 1
    create_websocket_env || exit 1

    # Install dependencies
    log_info "Setting up dependencies..."
    install_deps "webapp" || exit 1
    install_deps "websocket-server" || exit 1

    # Create logs directory
    mkdir -p "$LOG_DIR"
    mkdir -p "$SCRIPT_DIR/websocket-server/logs"

    # Start ngrok first
    log_info "Starting ngrok..."
    cd "$SCRIPT_DIR/websocket-server"
    ngrok start websocket --config ngrok.yml --log=stdout > "../logs/ngrok.log" 2>&1 &
    NGROK_PID=$!
    cd "$SCRIPT_DIR"
    
    # Wait for ngrok and verify tunnel
    log_info "Checking ngrok tunnel..."
    local ngrok_attempts=0
    while [ $ngrok_attempts -lt $MAX_ATTEMPTS ]; do
        log_info "Attempt $((ngrok_attempts + 1)): Waiting for ngrok tunnel..."
        
        # Check if ngrok admin interface is up
        if ! nc -z localhost $NGROK_PORT; then
            sleep $SLEEP_INTERVAL
            ngrok_attempts=$((ngrok_attempts + 1))
            continue
        fi
        
        # Get tunnel info
        local tunnel_info=$(curl -s http://localhost:$NGROK_PORT/api/tunnels)
        
        # Check if tunnel exists and points to correct port
        if echo "$tunnel_info" | grep -q "$NGROK_DOMAIN" && \
           echo "$tunnel_info" | grep -q "\"addr\":\"http://localhost:$WEBSOCKET_PORT\""; then
            log_success "Ngrok tunnel is ready and correctly configured!"
            break
        fi
        
        ngrok_attempts=$((ngrok_attempts + 1))
        sleep $SLEEP_INTERVAL
    done
    
    if [ $ngrok_attempts -eq $MAX_ATTEMPTS ]; then
        log_error "Failed to start ngrok tunnel with correct configuration after $MAX_ATTEMPTS attempts"
        log_error "Check $LOG_DIR/ngrok.log for details"
        cleanup
        exit 1
    fi

    # Then start websocket server
    log_info "Starting websocket server..."
    cd "$SCRIPT_DIR/websocket-server"
    DEBUG=* PORT=$WEBSOCKET_PORT ./node_modules/.bin/ts-node src/server.ts > "../logs/websocket.log" 2>&1 &
    WS_PID=$!
    cd "$SCRIPT_DIR"

    # Wait for websocket and verify health
    local ws_attempts=0
    while [ $ws_attempts -lt $MAX_ATTEMPTS ]; do
        # Check if port is open
        if ! nc -z localhost $WEBSOCKET_PORT; then
            log_info "Attempt $((ws_attempts + 1)): WebSocket port not open yet..."
            sleep $SLEEP_INTERVAL
            ws_attempts=$((ws_attempts + 1))
            continue
        fi
        
        # Check health endpoint
        if curl -s "http://localhost:$WEBSOCKET_PORT/health" | grep -q '"status":"ok"'; then
            log_success "WebSocket server is ready!"
            break
        fi
        
        log_info "Attempt $((ws_attempts + 1)): WebSocket not healthy yet..."
        ws_attempts=$((ws_attempts + 1))
        sleep $SLEEP_INTERVAL
    done

    if [ $ws_attempts -eq $MAX_ATTEMPTS ]; then
        log_error "WebSocket server failed to start after $MAX_ATTEMPTS attempts"
        log_error "Check $LOG_DIR/websocket.log for details"
        cleanup
        exit 1
    fi

    # Finally start webapp
    log_info "Starting webapp..."
    cd "$SCRIPT_DIR/webapp"
    DEBUG=* npm run dev -- -p $WEBAPP_PORT > "../logs/webapp.log" 2>&1 &
    WEBAPP_PID=$!
    cd "$SCRIPT_DIR"

    # Final status
    log_success "=== Setup Complete ==="
    log_info "Webapp running on http://localhost:$WEBAPP_PORT"
    log_info "WebSocket server running on http://localhost:$WEBSOCKET_PORT"
    log_info "Ngrok running on http://localhost:$NGROK_PORT"
    log_info "Public URL: https://mereka.ngrok.io"
    log_info "Logs available in $LOG_DIR/"
    log_info "Press Ctrl+C to stop all services"

    # Show live logs
    tail -f "$LOG_DIR"/*.log
}

# Run main function
main
