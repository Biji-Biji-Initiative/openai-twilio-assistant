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
    
    # Create logs directory
    mkdir -p "$LOG_DIR"
    
    # Initial cleanup and checks
    cleanup
    check_dependencies || exit 1
    
    # Check ports
    check_port $WEBAPP_PORT "Webapp" || exit 1
    check_port $WEBSOCKET_PORT "WebSocket Server" || exit 1
    
    # Create environment files
    create_webapp_env || exit 1
    create_websocket_env || exit 1
    
    # Start services with logging
    log_info "Starting services..."
    
    # Start ngrok
    log_info "Starting ngrok..."
    ngrok http $WEBAPP_PORT --domain=$NGROK_DOMAIN > "$LOG_DIR/ngrok.log" 2>&1 &
    sleep 2
    check_ngrok || {
        log_error "ngrok failed to start. Check $LOG_DIR/ngrok.log for details"
        exit 1
    }
    
    # Start websocket server
    log_info "Starting websocket server..."
    cd websocket-server
    PORT=$WEBSOCKET_PORT npm run dev > "../$LOG_DIR/websocket.log" 2>&1 &
    cd ..
    wait_for_service $WEBSOCKET_PORT "WebSocket server" || {
        log_error "Websocket server failed to start. Check $LOG_DIR/websocket.log for details"
        exit 1
    }
    
    # Start webapp
    log_info "Starting webapp..."
    cd webapp
    npm run dev -- -p $WEBAPP_PORT > "../$LOG_DIR/webapp.log" 2>&1 &
    cd ..
    wait_for_service $WEBAPP_PORT "Webapp" || {
        log_error "Webapp failed to start. Check $LOG_DIR/webapp.log for details"
        exit 1
    }
    
    # Final status
    log_success "All services started successfully!"
    log_info "Webapp: http://localhost:$WEBAPP_PORT"
    log_info "WebSocket: ws://localhost:$WEBSOCKET_PORT"
    log_info "Ngrok: https://$NGROK_DOMAIN"
    log_info "\nLog files:"
    log_info "- Webapp: $LOG_DIR/webapp.log"
    log_info "- WebSocket: $LOG_DIR/websocket.log"
    log_info "- Ngrok: $LOG_DIR/ngrok.log"
    log_info "\nMonitoring logs (Ctrl+C to stop)..."
    
    # Monitor logs
    tail -f "$LOG_DIR"/*.log
}

# Set up cleanup on script exit
trap cleanup EXIT INT TERM

# Run main function
main
