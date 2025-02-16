#!/bin/bash

# Text colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored status messages
print_status() {
    echo -e "${GREEN}[✓] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[!] $1${NC}"
}

print_error() {
    echo -e "${RED}[✗] $1${NC}"
}

# Function to check if a port is in use
check_port() {
    lsof -i ":$1" >/dev/null 2>&1
    return $?
}

# Function to wait for a port to be available
wait_for_port() {
    local port=$1
    local service=$2
    local timeout=30
    local count=0
    
    print_status "Waiting for $service to start on port $port..."
    while ! nc -z localhost $port; do
        sleep 1
        count=$((count + 1))
        if [ $count -ge $timeout ]; then
            print_error "$service failed to start within $timeout seconds"
            return 1
        fi
    done
    print_status "$service is running on port $port"
    return 0
}

# Function to verify ngrok tunnel
verify_ngrok() {
    local timeout=30
    local count=0
    
    print_status "Verifying ngrok tunnel..."
    while ! curl -s http://localhost:4040/api/tunnels | grep -q "https://.*ngrok.io"; do
        sleep 1
        count=$((count + 1))
        if [ $count -ge $timeout ]; then
            print_error "Ngrok tunnel verification failed"
            return 1
        fi
    done
    print_status "Ngrok tunnel verified"
    return 0
}

# Check if required environment variables are set
check_env_vars() {
    local missing_vars=0
    
    if [ ! -f "webapp/.env" ]; then
        print_error "webapp/.env file not found"
        missing_vars=1
    fi
    
    if [ ! -f "websocket-server/.env" ]; then
        print_error "websocket-server/.env file not found"
        missing_vars=1
    fi
    
    if [ $missing_vars -eq 1 ]; then
        print_error "Please set up your environment variables first"
        exit 1
    fi
    
    print_status "Environment files found"
}

# Main startup sequence
main() {
    echo "Starting OpenAI Twilio Assistant..."
    
    # Check environment variables
    check_env_vars
    
    # Clean up existing processes
    print_status "Cleaning up existing processes..."
    ./cleanup.sh
    
    # Start ngrok
    print_status "Starting ngrok..."
    ngrok http --domain=mereka.ngrok.io 8081 > /dev/null 2>&1 &
    sleep 2
    
    # Verify ngrok is running
    if ! verify_ngrok; then
        print_error "Failed to start ngrok"
        exit 1
    fi
    
    # Start websocket server
    print_status "Starting websocket server..."
    cd websocket-server
    npm run dev > /dev/null 2>&1 &
    cd ..
    
    # Wait for websocket server to start
    if ! wait_for_port 8081 "Websocket Server"; then
        print_error "Failed to start websocket server"
        exit 1
    fi
    
    # Start webapp
    print_status "Starting webapp..."
    cd webapp
    npm run dev > /dev/null 2>&1 &
    cd ..
    
    # Wait for webapp to start
    if ! wait_for_port 3000 "Webapp"; then
        print_error "Failed to start webapp"
        exit 1
    fi
    
    # Final status
    echo
    print_status "All services are running!"
    echo
    echo -e "${GREEN}You can now access:${NC}"
    echo -e "- Webapp: ${YELLOW}http://localhost:3000${NC}"
    echo -e "- Ngrok Interface: ${YELLOW}http://localhost:4040${NC}"
    echo
    echo -e "${YELLOW}To stop all services, run:${NC}"
    echo -e "./cleanup.sh"
    echo
    
    # Keep script running to maintain background processes
    wait
}

# Trap Ctrl+C and call cleanup
trap './cleanup.sh; exit 0' INT

# Start the application
main 