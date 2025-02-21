#!/bin/bash

# Source shared utilities
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SOURCE_DIR/utils.sh"

# Enable error handling
set -euo pipefail

# Main function
main() {
    # Move to project root
    cd "$SOURCE_DIR/.."
    
    # Initial cleanup
    cleanup
    
    # Create environment files
    create_webapp_env
    create_websocket_env
    
    # Start services
    log_info "Starting services..."
    
    # Start ngrok
    log_info "Starting ngrok..."
    ngrok http $WEBAPP_PORT --domain=$NGROK_DOMAIN > /dev/null 2>&1 &
    sleep 2
    check_ngrok || exit 1
    
    # Start websocket server
    log_info "Starting websocket server..."
    cd websocket-server
    PORT=$WEBSOCKET_PORT npm run dev > /dev/null 2>&1 &
    cd ..
    wait_for_service $WEBSOCKET_PORT "WebSocket server" || exit 1
    
    # Start webapp
    log_info "Starting webapp..."
    cd webapp
    npm run dev -- -p $WEBAPP_PORT > /dev/null 2>&1 &
    cd ..
    wait_for_service $WEBAPP_PORT "Webapp" || exit 1
    
    # Final status
    log_success "All services started!"
    log_info "Webapp: http://localhost:$WEBAPP_PORT"
    log_info "WebSocket: ws://localhost:$WEBSOCKET_PORT"
    log_info "Ngrok: https://$NGROK_DOMAIN"
    log_info "Press Ctrl+C to stop all services"
    
    # Wait for interrupt
    wait
}

# Set up cleanup on script exit
trap cleanup EXIT INT TERM

# Run main function
main
