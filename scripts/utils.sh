#!/bin/bash

# Shared utilities for Twilio demo project scripts
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
    lsof -ti :$WEBAPP_PORT | xargs kill -9 2>/dev/null || true
    lsof -ti :$WEBSOCKET_PORT | xargs kill -9 2>/dev/null || true
    
    # Kill any lingering node processes from our directories
    pkill -f "node.*webapp" || true
    pkill -f "node.*websocket-server" || true
    
    # Kill ngrok
    pkill -f "ngrok" || true
    
    # Clean up logs if they exist
    if [[ -d "$LOG_DIR" ]]; then
        rm -rf "$LOG_DIR"
    fi
    
    # Small delay to ensure processes are cleaned up
    sleep 1
}

# Check dependencies
check_dependencies() {
    local missing_deps=()
    
    # Required commands
    local deps=("node" "npm" "ngrok" "curl" "lsof")
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        return 1
    fi
    
    log_success "All dependencies are installed"
    return 0
}

# Function to check if a port is available
check_port() {
    local port=$1
    local service=${2:-"Service"}
    
    if lsof -i :"$port" > /dev/null 2>&1; then
        log_error "$service port $port is already in use"
        return 1
    fi
    log_success "$service port $port is available"
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
    log_success "Created webapp/.env"
}

# Function to create websocket-server .env
create_websocket_env() {
    log_info "Creating/updating websocket-server/.env file..."
    cat > "websocket-server/.env" << EOL
# OpenAI Configuration
OPENAI_API_KEY=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

# Ngrok Configuration
NGROK_DOMAIN=$NGROK_DOMAIN
EOL
    log_success "Created websocket-server/.env"
}

# Function to wait for a service
wait_for_service() {
    local port=$1
    local service=$2
    local attempt=1
    
    log_info "Waiting for $service to be ready on port $port..."
    while ! curl -s "http://localhost:$port" > /dev/null 2>&1; do
        if [ $attempt -gt $MAX_ATTEMPTS ]; then
            log_error "$service failed to start after $MAX_ATTEMPTS attempts"
            return 1
        fi
        log_info "Attempt $attempt: $service not ready yet..."
        sleep $SLEEP_INTERVAL
        ((attempt++))
    done
    log_success "$service is ready!"
    return 0
}

# Function to check ngrok tunnel
check_ngrok() {
    local attempt=1
    
    log_info "Checking ngrok tunnel..."
    while ! curl -s "http://localhost:$NGROK_PORT/api/tunnels" | grep -q "$NGROK_DOMAIN"; do
        if [ $attempt -gt $MAX_ATTEMPTS ]; then
            log_error "Ngrok tunnel failed to establish after $MAX_ATTEMPTS attempts"
            return 1
        fi
        log_info "Attempt $attempt: Waiting for ngrok tunnel..."
        sleep $SLEEP_INTERVAL
        ((attempt++))
    done
    log_success "Ngrok tunnel is ready!"
    return 0
}

# Function to install dependencies
install_deps() {
    local dir=$1
    log_info "Installing dependencies in $dir..."
    
    cd "$dir"
    if [[ -f "package.json" ]]; then
        if ! npm install; then
            log_error "Failed to install dependencies in $dir"
            return 1
        fi
        log_success "Installed dependencies in $dir"
    else
        log_warning "No package.json found in $dir"
    fi
    cd - > /dev/null
}

# Export all functions
export -f log_info log_success log_error log_warning
export -f cleanup check_dependencies check_port
export -f create_webapp_env create_websocket_env
export -f wait_for_service check_ngrok install_deps
