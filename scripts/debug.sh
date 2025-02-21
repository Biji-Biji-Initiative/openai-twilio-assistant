#!/bin/bash

# Debug script for Twilio demo project
set -euo pipefail
IFS=$'\n\t'

# Configuration
WEBAPP_PORT=3000
WEBSOCKET_PORT=8081
NGROK_PORT=4040
NGROK_DOMAIN="mereka.ngrok.io"
LOG_DIR="logs"
MAX_ATTEMPTS=30
SLEEP_INTERVAL=1

# Colors and Symbols
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
CHECK_MARK="✓"
CROSS_MARK="✗"
INFO_MARK="ℹ"

# Logging functions
log_info()    { echo -e "${BLUE}${INFO_MARK} $*${NC}"; }
log_success() { echo -e "${GREEN}${CHECK_MARK} $*${NC}"; }
log_error()   { echo -e "${RED}${CROSS_MARK} $*${NC}"; }
log_warning() { echo -e "${YELLOW}⚠ $*${NC}"; }

# Function for cleanup
cleanup() {
    log_info "Cleaning up processes..."
    
    # Kill processes by port
    lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    lsof -ti :8081 | xargs kill -9 2>/dev/null || true
    
    # Kill ngrok
    pkill -f "ngrok" || true
    
    # Clean up logs
    rm -rf "$LOG_DIR"
    
    # Small delay to ensure processes are cleaned up
    sleep 1
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check required commands
    local commands=("node" "npm" "ngrok")
    for cmd in "${commands[@]}"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            log_error "$cmd is not installed"
            return 1
        fi
    done
    
    # Check node version
    local node_version
    node_version=$(node -v | cut -d 'v' -f2)
    if [[ "$node_version" < "16.0.0" ]]; then
        log_error "Node.js version must be 16.0.0 or higher (found $node_version)"
        return 1
    fi
    
    # Check npm dependencies in both directories
    for dir in "webapp" "websocket-server"; do
        if [ ! -d "$dir/node_modules" ]; then
            log_warning "Installing dependencies in $dir..."
            (cd "$dir" && npm install) || {
                log_error "Failed to install dependencies in $dir"
                return 1
            }
        fi
    done
    
    log_success "All dependencies are installed"
    return 0
}

# Function to check if a port is available
check_port() {
    local port=$1
    local service=$2
    
    log_info "Checking port $port for $service..."
    
    if lsof -i :"$port" >/dev/null 2>&1; then
        log_error "Port $port is already in use"
        return 1
    fi
    
    log_success "Port $port is available"
    return 0
}

# Function to create webapp .env
create_webapp_env() {
    log_info "Creating/updating webapp/.env file..."
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
    log_info "Creating/updating websocket-server/.env file..."
    cat > "websocket-server/.env" << EOL
# OpenAI Configuration
OPENAI_API_KEY=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

# Ngrok Configuration
PUBLIC_URL=https://mereka.ngrok.io
NGROK_AUTH_TOKEN=2sy7rzIlzrNhrpsYw151gKDIXcy_3aPfJJCdxwkyJ19KF9XnF
EOL
}

# Function to wait for a service
wait_for_service() {
    local url=$1
    local service=$2
    local attempts=$MAX_ATTEMPTS
    
    log_info "Waiting for $service to start..."
    
    while [ $attempts -gt 0 ]; do
        if curl -s "$url" >/dev/null; then
            log_success "$service is running"
            return 0
        fi
        attempts=$((attempts - 1))
        sleep $SLEEP_INTERVAL
    done
    
    log_error "$service failed to start"
    return 1
}

# Function to check ngrok tunnel
check_ngrok() {
    log_info "Checking ngrok tunnel..."
    local attempts=$MAX_ATTEMPTS
    
    while [ $attempts -gt 0 ]; do
        if curl -s "http://localhost:$NGROK_PORT/api/tunnels" | grep -q "$NGROK_DOMAIN"; then
            log_success "ngrok tunnel established"
            return 0
        fi
        attempts=$((attempts - 1))
        sleep $SLEEP_INTERVAL
    done
    
    log_error "Failed to establish ngrok tunnel"
    return 1
}

# Set up cleanup on script exit
trap cleanup EXIT INT TERM

# Create logs directory
mkdir -p "$LOG_DIR"

# Initial cleanup
cleanup

# Check dependencies and ports
check_dependencies || exit 1
check_port $WEBAPP_PORT "webapp" || exit 1
check_port $WEBSOCKET_PORT "websocket" || exit 1

# Create/update env files
create_webapp_env
create_websocket_env

# Start services with logging
log_info "Starting services..."

# Start ngrok
log_info "Starting ngrok..."
ngrok http 8081 --domain=mereka.ngrok.io > "$LOG_DIR/ngrok.log" 2>&1 &
sleep 2
check_ngrok || {
    log_error "ngrok failed to start. Check $LOG_DIR/ngrok.log for details"
    exit 1
}

# Start websocket server
log_info "Starting websocket server..."
cd websocket-server
npm run dev > "../$LOG_DIR/websocket.log" 2>&1 &
cd ..
wait_for_service "http://localhost:$WEBSOCKET_PORT" "websocket server" || {
    log_error "Websocket server failed to start. Check $LOG_DIR/websocket.log for details"
    exit 1
}

# Start webapp
log_info "Starting webapp..."
cd webapp
npm run dev > "../$LOG_DIR/webapp.log" 2>&1 &
cd ..
wait_for_service "http://localhost:$WEBAPP_PORT" "webapp" || {
    log_error "Webapp failed to start. Check $LOG_DIR/webapp.log for details"
    exit 1
}

log_success "All services started successfully!"
echo "✓ Webapp: http://localhost:3000"
echo "✓ WebSocket: ws://localhost:8081"
echo "✓ Ngrok: https://mereka.ngrok.io"
echo -e "\nLog files:"
echo "- Webapp: $LOG_DIR/webapp.log"
echo "- WebSocket: $LOG_DIR/websocket.log"
echo "- Ngrok: $LOG_DIR/ngrok.log"
echo -e "\nPress Ctrl+C to stop all services"

# Monitor logs
tail -f "$LOG_DIR"/*.log
