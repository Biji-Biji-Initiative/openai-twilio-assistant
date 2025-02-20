#!/bin/bash

# -----------------------------------------------------------------------------
# Directory Setup - ENSURE WE'RE IN THE CORRECT PROJECT
# -----------------------------------------------------------------------------
# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Get the project root (parent directory of scripts)
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Verify we're in the correct project
if [[ "$PROJECT_ROOT" != */openai-realtime-twilio-demo ]]; then
    echo "Error: This script must be run from the openai-realtime-twilio-demo project"
    echo "Expected path to end with: openai-realtime-twilio-demo"
    echo "Current path: $PROJECT_ROOT"
    exit 1
fi

# Always start from project root
cd "$PROJECT_ROOT" || {
    echo "Failed to navigate to project root: $PROJECT_ROOT"
    exit 1
}

# -----------------------------------------------------------------------------
# Strict Mode and Error Handling
# -----------------------------------------------------------------------------
set -euo pipefail
IFS=$'\n\t'
set -o errtrace

# -----------------------------------------------------------------------------
# Global Configuration - DO NOT MODIFY THESE VALUES
# -----------------------------------------------------------------------------
# Required port configuration
readonly WEBSOCKET_PORT=8081  # Must match PORT in .env
readonly WEBAPP_PORT=3000     # Next.js default port
readonly NGROK_PORT=4040      # ngrok default port
readonly NGROK_DOMAIN="mereka.ngrok.io"  # Must match PUBLIC_URL in .env

# Required environment variables with exact values
readonly REQUIRED_PORT="8081"
readonly REQUIRED_NODE_ENV="development"
readonly REQUIRED_PUBLIC_URL="https://mereka.ngrok.io"

# Project paths
readonly LOG_DIR="${PROJECT_ROOT}/logs"
readonly PID_DIR="${PROJECT_ROOT}/pids"

# Other configuration
readonly MAX_ATTEMPTS=30
readonly SLEEP_INTERVAL=1
LOG_LEVEL="INFO"  # Options: DEBUG, INFO, WARN, ERROR

# Colors and Symbols
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'
readonly CHECK_MARK="\xE2\x9C\x94"
readonly CROSS_MARK="\xE2\x9C\x98"
readonly INFO_MARK="ℹ"

# Time format for logs
readonly TIME_FMT="+%Y-%m-%d %H:%M:%S"

# -----------------------------------------------------------------------------
# Command-Line Arguments
# -----------------------------------------------------------------------------
usage() {
    cat <<EOF
Usage: $0 [options]

Options:
  -h              Show this help message and exit
  -v              Enable verbose logging (DEBUG level)
  -c config_file  Use external config file
EOF
}

while getopts "hvc:" opt; do
    case ${opt} in
        h)
            usage
            exit 0
            ;;
        v)
            LOG_LEVEL="DEBUG"
            ;;
        c)
            if [ -f "${OPTARG}" ]; then
                # shellcheck source=/dev/null
                source "${OPTARG}"
            else
                echo "Config file ${OPTARG} not found"
                exit 1
            fi
            ;;
        \?)
            usage
            exit 1
            ;;
    esac
done

# -----------------------------------------------------------------------------
# Advanced Logging
# -----------------------------------------------------------------------------
log_with_color() {
    local level=$1
    local color=$2
    local symbol=$3
    shift 3
    case "$level" in
        DEBUG)  [[ "$LOG_LEVEL" == "DEBUG" ]] || return ;;
        INFO)   ;;  # Always log INFO and above
        WARN)   ;;
        ERROR)  ;;
    esac
    echo -e "$(date "$TIME_FMT") ${color}${symbol} [$level] $*${NC}"
}

log_debug()   { log_with_color "DEBUG" "${BLUE}" "🐞" "$@"; }
log_info()    { log_with_color "INFO" "${BLUE}" "${INFO_MARK}" "$@"; }
log_warning() { log_with_color "WARN" "${YELLOW}" "⚠" "$@"; }
log_error()   { log_with_color "ERROR" "${RED}" "${CROSS_MARK}" "$@"; }
log_success() { log_with_color "INFO" "${GREEN}" "${CHECK_MARK}" "$@"; }

# -----------------------------------------------------------------------------
# Error Handler
# -----------------------------------------------------------------------------
error_handler() {
    local exit_code=$?
    local line_no=$1
    local command="${BASH_COMMAND}"
    local stack_trace
    
    # Get stack trace
    stack_trace=$(
        local frame=0
        while caller $frame; do
            ((frame++))
        done
    )
    
    log_error "Error occurred in command: '${command}'"
    log_error "Exit code: ${exit_code}"
    log_error "Line number: ${line_no}"
    log_error "Stack trace:"
    while IFS=' ' read -r line func file; do
        log_error "  at ${func} (${file}:${line})"
    done <<< "$stack_trace"
    
    cleanup
    exit "${exit_code}"
}
trap 'error_handler ${LINENO}' ERR

# -----------------------------------------------------------------------------
# Command Validation
# -----------------------------------------------------------------------------
check_command() {
    local cmd=$1
    local min_version=$2
    
    if ! command -v "$cmd" >/dev/null 2>&1; then
        log_error "Required command '$cmd' is not installed"
        return 1
    fi
    
    if [ -n "$min_version" ]; then
        local version
        case "$cmd" in
            node)
                version=$(node -v | cut -d 'v' -f2)
                if ! version_gte "$version" "$min_version"; then
                    log_error "Node.js version $version is less than required version $min_version"
                    return 1
                fi
                ;;
            npm)
                version=$(npm -v)
                if ! version_gte "$version" "$min_version"; then
                    log_error "npm version $version is less than required version $min_version"
                    return 1
                fi
                ;;
            *)
                log_warning "Version check not implemented for $cmd"
                ;;
        esac
    fi
    
    log_success "Command '$cmd' is available"
    return 0
}

version_gte() {
    local version1=$1
    local version2=$2
    if [ "$(printf '%s\n' "$version1" "$version2" | sort -V | head -n1)" = "$version2" ]; then
        return 0
    else
        return 1
    fi
}

# Check required commands with minimum versions
required_commands=(
    "node:16.0.0"
    "npm:7.0.0"
    "ngrok"
    "curl"
    "lsof"
    "wscat"
)

check_required_commands() {
    log_info "Checking required commands..."
    local failed=0
    
    for cmd_spec in "${required_commands[@]}"; do
        IFS=':' read -r cmd min_version <<< "$cmd_spec"
        if ! check_command "$cmd" "$min_version"; then
            failed=$((failed + 1))
        fi
    done
    
    if [ "$failed" -gt 0 ]; then
        log_error "$failed command(s) failed validation"
        return 1
    fi
    
    log_success "All required commands are available"
    return 0
}

# -----------------------------------------------------------------------------
# Process Management
# -----------------------------------------------------------------------------
get_pid() {
    local name=$1
    local pid_file="${PID_DIR}/${name}.pid"
    
    if [ ! -f "$pid_file" ]; then
        return 1
    fi
    
    local pid
    pid=$(cat "$pid_file")
    
    if [ -z "$pid" ]; then
        rm -f "$pid_file"
        return 1
    fi
    
    if ! kill -0 "$pid" 2>/dev/null; then
        rm -f "$pid_file"
        return 1
    fi
    
    echo "$pid"
    return 0
}

is_process_running() {
    local pid=${1:-}
    if [ -z "$pid" ]; then
        return 1
    fi
    
    if ! kill -0 "$pid" 2>/dev/null; then
        return 1
    fi
    
    # Check if process is zombie
    local state
    state=$(ps -p "$pid" -o state= 2>/dev/null)
    if [ "$state" = "Z" ]; then
        return 1
    fi
    
    return 0
}

kill_process() {
    local name=$1
    local force=${2:-false}
    local pid
    
    pid=$(get_pid "$name")
    if [ -z "$pid" ]; then
        log_debug "No PID found for $name"
        return 0
    fi
    
    if ! is_process_running "$pid"; then
        log_debug "Process $name (PID: $pid) is not running"
        rm -f "${PID_DIR}/${name}.pid"
        return 0
    fi
    
    log_info "Terminating $name (PID: $pid)..."
    
    if [ "$force" = true ]; then
        kill -9 "$pid" 2>/dev/null || true
    else
        kill -15 "$pid" 2>/dev/null || true
        
        # Wait for process to terminate
        local count=0
        while is_process_running "$pid" && [ $count -lt 10 ]; do
            sleep 0.5
            count=$((count + 1))
        done
        
        # If still running, force kill
        if is_process_running "$pid"; then
            log_warning "Process $name did not terminate gracefully, forcing..."
            kill -9 "$pid" 2>/dev/null || true
        fi
    fi
    
    # Verify process is gone
    sleep 1
    if is_process_running "$pid"; then
        log_error "Failed to terminate $name (PID: $pid)"
        return 1
    fi
    
    rm -f "${PID_DIR}/${name}.pid"
    log_success "$name terminated"
    return 0
}

kill_by_port() {
    local port=$1
    local pids
    
    pids=$(lsof -ti :"$port" 2>/dev/null || true)
    if [ -z "$pids" ]; then
        return 0
    fi
    
    log_warning "Found process(es) using port $port: $pids"
    
    for pid in $pids; do
        local cmd
        cmd=$(ps -p "$pid" -o comm= 2>/dev/null || true)
        log_info "Terminating process $pid ($cmd) using port $port"
        
        kill -15 "$pid" 2>/dev/null || true
        sleep 1
        
        if kill -0 "$pid" 2>/dev/null; then
            log_warning "Process $pid did not terminate gracefully, forcing..."
            kill -9 "$pid" 2>/dev/null || true
            sleep 1
        fi
        
        if kill -0 "$pid" 2>/dev/null; then
            log_error "Failed to terminate process $pid"
            return 1
        fi
    done
    
    return 0
}

# -----------------------------------------------------------------------------
# Cleanup Function
# -----------------------------------------------------------------------------
cleanup() {
    log_info "Cleaning up services and processes..."
    
    # Kill processes by their PID files
    for service in websocket ngrok webapp; do
        kill_process "$service" true
    done
    
    # Additional cleanup for any stray processes
    for port in $WEBSOCKET_PORT $WEBAPP_PORT $NGROK_PORT; do
        kill_by_port "$port"
    done
    
    # Clean up PID and log files
    rm -f "${PID_DIR}"/*.pid
    
    log_success "Cleanup complete"
}
trap cleanup EXIT SIGINT SIGTERM

# Function to handle fatal errors
die() {
    log_error "$1"
    exit 1
}

# -----------------------------------------------------------------------------
# Dependency Checking
# -----------------------------------------------------------------------------
check_dependencies() {
    log_info "Checking project dependencies..."
    
    # Check WebSocket Server dependencies
    local ws_dir="${PROJECT_ROOT}/openai-realtime-twilio-demo/websocket-server"
    pushd "$ws_dir" >/dev/null || die "Failed to access websocket-server directory"
    
    if [ ! -f "package.json" ]; then
        popd >/dev/null
        die "package.json not found in websocket-server directory"
    fi
    
    if [ ! -d "node_modules" ]; then
        log_info "Installing WebSocket Server dependencies..."
        if ! npm install; then
            popd >/dev/null
            die "Failed to install WebSocket Server dependencies"
        fi
    fi
    
    # Check for TypeScript compilation errors
    log_info "Checking TypeScript compilation..."
    if ! npx tsc --noEmit; then
        popd >/dev/null
        die "TypeScript compilation check failed"
    fi
    
    popd >/dev/null
    
    # Check webapp dependencies
    local webapp_dir="${PROJECT_ROOT}/openai-realtime-twilio-demo/webapp"
    pushd "$webapp_dir" >/dev/null || die "Failed to access webapp directory"
    
    if [ ! -f "package.json" ]; then
        popd >/dev/null
        die "package.json not found in webapp directory"
    fi
    
    if [ ! -d "node_modules" ]; then
        log_info "Installing webapp dependencies..."
        if ! npm install; then
            popd >/dev/null
            die "Failed to install webapp dependencies"
        fi
    fi
    
    # Check for Next.js build issues
    log_info "Checking Next.js build..."
    if ! npm run build; then
        popd >/dev/null
        die "Next.js build check failed"
    fi
    
    popd >/dev/null
    
    log_success "All dependencies are installed and valid"
    return 0
}

# -----------------------------------------------------------------------------
# Service Management
# -----------------------------------------------------------------------------
init_directories() {
    log_info "Initializing directory structure..."
    mkdir -p "${LOG_DIR}" "${PID_DIR}"
    rm -f "${LOG_DIR}"/*.log "${PID_DIR}"/*.pid
}

# -----------------------------------------------------------------------------
# Port Management
# -----------------------------------------------------------------------------
check_port() {
    local port=$1
    local service=$2
    local wait_time=${3:-5}
    
    # Verify we're using the correct port for each service
    case "$service" in
        websocket)
            if [ "$port" != "$WEBSOCKET_PORT" ]; then
                log_error "Incorrect port for WebSocket Server"
                log_error "Expected: $WEBSOCKET_PORT"
                log_error "Found: $port"
                return 1
            fi
            ;;
        webapp)
            if [ "$port" != "$WEBAPP_PORT" ]; then
                log_error "Incorrect port for Next.js webapp"
                log_error "Expected: $WEBAPP_PORT"
                log_error "Found: $port"
                return 1
            fi
            ;;
        ngrok)
            if [ "$port" != "$NGROK_PORT" ]; then
                log_error "Incorrect port for ngrok"
                log_error "Expected: $NGROK_PORT"
                log_error "Found: $port"
                return 1
            fi
            ;;
    esac
    
    log_info "Checking port $port for $service..."
    
    # Check if port is in use
    local pid
    pid=$(lsof -ti :"$port" 2>/dev/null || true)
    
    if [ -n "$pid" ]; then
        local cmd
        cmd=$(ps -p "$pid" -o comm= 2>/dev/null || true)
        log_warning "Port $port is in use by process $pid ($cmd)"
        
        # If it's our own service, that's okay
        if [ -f "${PID_DIR}/${service}.pid" ] && [ "$pid" = "$(cat "${PID_DIR}/${service}.pid")" ]; then
            log_info "Port is used by our own $service process"
            return 0
        fi
        
        # Try to free the port
        log_info "Attempting to free port $port..."
        if ! kill_by_port "$port"; then
            log_error "Failed to free port $port"
            return 1
        fi
        
        # Wait for port to be actually freed
        local count=0
        while lsof -ti :"$port" >/dev/null 2>&1; do
            if [ $count -ge $wait_time ]; then
                log_error "Timeout waiting for port $port to be freed"
                return 1
            fi
            sleep 1
            count=$((count + 1))
        done
    fi
    
    # Verify port is actually available by trying to bind to it
    if ! (echo "" | nc -l "$port" >/dev/null 2>&1 &); then
        log_error "Port $port is not available"
        return 1
    fi
    
    # Clean up our test listener
    kill_by_port "$port" >/dev/null 2>&1
    
    log_success "Port $port is available for $service"
    return 0
}

# -----------------------------------------------------------------------------
# Health Checks
# -----------------------------------------------------------------------------
wait_for_url() {
    local url=$1
    local service=$2
    local timeout=${3:-30}
    local interval=${4:-1}
    local attempt=0
    local response
    
    log_info "Waiting for $service at $url..."
    
    while [ $attempt -lt $timeout ]; do
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || true)
        
        if [ "$response" = "200" ]; then
            log_success "$service is responding at $url"
            return 0
        fi
        
        attempt=$((attempt + 1))
        log_debug "Attempt $attempt/$timeout - $service not ready (HTTP $response)"
        sleep "$interval"
    done
    
    log_error "$service failed to respond at $url after $timeout seconds"
    return 1
}

check_websocket_health() {
    local port=$1
    local timeout=${2:-30}
    local ws_url="ws://localhost:$port"
    
    log_info "Checking WebSocket Server health..."
    
    # Check WebSocket upgrade
    log_info "Testing WebSocket upgrade..."
    if ! curl -i -N \
        -H "Connection: Upgrade" \
        -H "Upgrade: websocket" \
        -H "Host: localhost:$port" \
        -H "Origin: http://localhost:$port" \
        "http://localhost:$port/logs" 2>/dev/null | grep -q "101 Switching Protocols"; then
        log_error "WebSocket upgrade failed"
        return 1
    fi
    
    # Test actual WebSocket connection
    if command -v wscat >/dev/null 2>&1; then
        log_info "Testing WebSocket connection..."
        if ! echo '{"type":"ping"}' | timeout 5 wscat -c "$ws_url/logs" --no-color 2>&1 | grep -q "connected"; then
            log_error "WebSocket connection test failed"
            return 1
        fi
    else
        log_warning "wscat not available, skipping WebSocket connection test"
    fi
    
    log_success "WebSocket Server is healthy"
    return 0
}

check_ngrok_health() {
    local timeout=${1:-30}
    local interval=${2:-1}
    local attempt=0
    
    log_info "Checking ngrok health..."
    
    # First check if ngrok API is responding
    if ! wait_for_url "http://localhost:${NGROK_PORT}/api/tunnels" "ngrok API" "$timeout"; then
        return 1
    fi
    
    # Then check for our specific tunnel
    while [ $attempt -lt $timeout ]; do
        local tunnel_info
        tunnel_info=$(curl -s "http://localhost:${NGROK_PORT}/api/tunnels")
        
        if echo "$tunnel_info" | grep -q "mereka.ngrok.io"; then
            local tunnel_url
            tunnel_url=$(echo "$tunnel_info" | grep -o 'https://[^"]*')
            log_info "Found ngrok tunnel URL: $tunnel_url"
            
            # Test the tunnel
            if curl -s "$tunnel_url" >/dev/null; then
                log_success "ngrok tunnel is responding"
                export NGROK_URL="$tunnel_url"
                return 0
            fi
        fi
        
        attempt=$((attempt + 1))
        log_debug "Attempt $attempt/$timeout - Waiting for ngrok tunnel..."
        sleep "$interval"
    done
    
    log_error "Failed to establish ngrok tunnel"
    return 1
}

check_webapp_health() {
    local port=$1
    local timeout=${2:-30}
    
    log_info "Checking Next.js webapp health..."
    
    # Wait for webapp to start responding
    if ! wait_for_url "http://localhost:$port" "Next.js webapp" "$timeout"; then
        return 1
    fi
    
    # Check if we get valid HTML response
    if ! curl -s "http://localhost:$port" | grep -q "<html"; then
        log_error "Webapp is not returning valid HTML"
        return 1
    fi
    
    log_success "Next.js webapp is healthy"
    return 0
}

test_websocket_connection() {
    local timeout=${1:-30}
    local interval=${2:-1}
    local attempt=0
    
    log_info "Testing end-to-end WebSocket connection..."
    
    # Get ngrok WebSocket URL
    if [ -z "${NGROK_URL:-}" ]; then
        log_error "ngrok URL not found"
        return 1
    fi
    
    local ws_url="${NGROK_URL/https/wss}/logs"
    log_info "Testing connection to: $ws_url"
    
    # Test WebSocket connection through ngrok
    while [ $attempt -lt $timeout ]; do
        if timeout 5 wscat -c "$ws_url" --no-color 2>&1 | grep -q "connected"; then
            log_success "WebSocket connection established through ngrok"
            return 0
        fi
        
        attempt=$((attempt + 1))
        log_debug "Attempt $attempt/$timeout - Retrying WebSocket connection..."
        sleep "$interval"
    done
    
    # If we get here, connection failed
    log_error "Failed to establish WebSocket connection through ngrok"
    
    # Dump service logs for debugging
    log_info "Dumping service logs..."
    echo "=== WebSocket Server Log ==="
    tail -n 50 "${LOG_DIR}/websocket.log"
    echo "=== ngrok Log ==="
    tail -n 50 "${LOG_DIR}/ngrok.log"
    
    return 1
}

# -----------------------------------------------------------------------------
# Service Startup
# -----------------------------------------------------------------------------
start_websocket_server() {
    local ws_dir="${PROJECT_ROOT}/openai-realtime-twilio-demo/websocket-server"
    log_info "Starting WebSocket Server..."
    
    # Check port availability
    if ! check_port "$WEBSOCKET_PORT" "websocket"; then
        return 1
    fi
    
    # Build the server
    pushd "$ws_dir" >/dev/null || return 1
    log_info "Building WebSocket Server..."
    if ! npm run build; then
        log_error "Failed to build WebSocket Server"
        popd >/dev/null
        return 1
    fi
    
    # Copy template files
    log_info "Copying template files..."
    mkdir -p dist/templates
    if ! cp -r templates/* dist/templates/; then
        log_error "Failed to copy template files"
        popd >/dev/null
        return 1
    fi
    
    # Kill any existing instance
    kill_process "websocket"
    sleep 2
    
    # Start the server
    log_info "Starting WebSocket Server process..."
    node dist/server.js > "${LOG_DIR}/websocket.log" 2>&1 &
    local pid=$!
    echo "$pid" > "${PID_DIR}/websocket.pid"
    popd >/dev/null
    
    # Wait for server to be healthy
    if ! check_websocket_health "$WEBSOCKET_PORT"; then
        kill_process "websocket"
        return 1
    fi
    
    return 0
}

start_ngrok() {
    log_info "Starting ngrok..."
    
    # Check port availability
    if ! check_port "$NGROK_PORT" "ngrok"; then
        return 1
    fi
    
    # Kill any existing instance
    kill_process "ngrok"
    pkill -f "ngrok http ${WEBSOCKET_PORT}" || true
    sleep 2
    
    # Start ngrok
    log_info "Starting ngrok process..."
    ngrok http "${WEBSOCKET_PORT}" --domain=mereka.ngrok.io > "${LOG_DIR}/ngrok.log" 2>&1 &
    local pid=$!
    echo "$pid" > "${PID_DIR}/ngrok.pid"
    
    # Wait for ngrok to be healthy
    if ! check_ngrok_health; then
        kill_process "ngrok"
        return 1
    fi
    
    return 0
}

start_webapp() {
    local webapp_dir="${PROJECT_ROOT}/openai-realtime-twilio-demo/webapp"
    log_info "Starting Next.js webapp..."
    
    # Check port availability
    if ! check_port "$WEBAPP_PORT" "webapp"; then
        return 1
    fi
    
    # Build the webapp
    pushd "$webapp_dir" >/dev/null || return 1
    log_info "Building webapp..."
    if ! npm run build; then
        log_error "Failed to build webapp"
        popd >/dev/null
        return 1
    fi
    
    # Kill any existing instance
    kill_process "webapp"
    sleep 2
    
    # Start the webapp
    log_info "Starting webapp process..."
    npm run start > "${LOG_DIR}/webapp.log" 2>&1 &
    local pid=$!
    echo "$pid" > "${PID_DIR}/webapp.pid"
    popd >/dev/null
    
    # Wait for webapp to be healthy
    if ! check_webapp_health "$WEBAPP_PORT"; then
        kill_process "webapp"
        return 1
    fi
    
    return 0
}

# -----------------------------------------------------------------------------
# Log Monitoring
# -----------------------------------------------------------------------------
monitor_logs() {
    log_info "Starting log monitor..."
    
    # Use multitail if available
    if command -v multitail >/dev/null 2>&1; then
        multitail \
            -ci yellow "${LOG_DIR}/websocket.log" \
            -ci green "${LOG_DIR}/ngrok.log" \
            -ci blue "${LOG_DIR}/webapp.log"
    else
        # Fallback to simple tail with timestamps
        tail -f "${LOG_DIR}"/*.log | while read -r line; do
            echo "[$(date "$TIME_FMT")] $line"
        done
    fi
}

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------
main() {
    log_info "🚀 Starting comprehensive service manager script..."
    
    # Initialize
    init_directories
    check_required_commands
    check_env_vars
    check_dependencies
    
    # Start services
    if ! start_websocket_server; then
        log_error "Failed to start WebSocket Server"
        cleanup
        exit 1
    fi
    
    if ! start_ngrok; then
        log_error "Failed to start ngrok"
        cleanup
        exit 1
    fi
    
    if ! start_webapp; then
        log_error "Failed to start webapp"
        cleanup
        exit 1
    fi
    
    # Test end-to-end connectivity
    if ! test_websocket_connection; then
        log_error "WebSocket connection test failed"
        cleanup
        exit 1
    fi
    
    log_success "All services are running and healthy!"
    
    # Print service status
    echo -e "\n📊 Service Status:"
    echo "WebSocket Server (PID: $(get_pid websocket)) - Log: ${LOG_DIR}/websocket.log"
    echo "ngrok (PID: $(get_pid ngrok)) - Log: ${LOG_DIR}/ngrok.log"
    echo "Webapp (PID: $(get_pid webapp)) - Log: ${LOG_DIR}/webapp.log"
    
    # Monitor logs
    echo -e "\n📝 Starting log monitor (Ctrl+C to exit)..."
    monitor_logs
}

check_env_vars() {
    log_info "Verifying environment variables..."
    
    local ws_dir="${PROJECT_ROOT}/openai-realtime-twilio-demo/websocket-server"
    pushd "$ws_dir" >/dev/null || die "Failed to access websocket-server directory"
    
    if [ ! -f .env ]; then
        popd >/dev/null
        die ".env file not found in websocket-server directory"
    fi
    
    local missing_vars=0
    local incorrect_vars=0
    
    # Check PORT
    local port_value
    port_value=$(grep "^PORT=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
    if [ -z "$port_value" ]; then
        log_error "PORT is missing in .env"
        missing_vars=$((missing_vars + 1))
    elif [ "$port_value" != "$REQUIRED_PORT" ]; then
        log_error "PORT has incorrect value"
        log_error "Expected: $REQUIRED_PORT"
        log_error "Found: $port_value"
        incorrect_vars=$((incorrect_vars + 1))
    else
        log_success "PORT has correct value: $port_value"
    fi
    
    # Check NODE_ENV
    local node_env_value
    node_env_value=$(grep "^NODE_ENV=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
    if [ -z "$node_env_value" ]; then
        log_error "NODE_ENV is missing in .env"
        missing_vars=$((missing_vars + 1))
    elif [ "$node_env_value" != "$REQUIRED_NODE_ENV" ]; then
        log_error "NODE_ENV has incorrect value"
        log_error "Expected: $REQUIRED_NODE_ENV"
        log_error "Found: $node_env_value"
        incorrect_vars=$((incorrect_vars + 1))
    else
        log_success "NODE_ENV has correct value: $node_env_value"
    fi
    
    # Check PUBLIC_URL
    local public_url_value
    public_url_value=$(grep "^PUBLIC_URL=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
    if [ -z "$public_url_value" ]; then
        log_error "PUBLIC_URL is missing in .env"
        missing_vars=$((missing_vars + 1))
    elif [ "$public_url_value" != "$REQUIRED_PUBLIC_URL" ]; then
        log_error "PUBLIC_URL has incorrect value"
        log_error "Expected: $REQUIRED_PUBLIC_URL"
        log_error "Found: $public_url_value"
        incorrect_vars=$((incorrect_vars + 1))
    else
        log_success "PUBLIC_URL has correct value: $public_url_value"
    fi
    
    # Check presence of other required variables
    local required_vars=(
        "OPENAI_API_KEY"
        "TWILIO_ACCOUNT_SID"
        "TWILIO_AUTH_TOKEN"
        "TWILIO_PHONE_NUMBER"
    )
    
    for var in "${required_vars[@]}"; do
        local value
        value=$(grep "^${var}=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
        if [ -z "$value" ]; then
            log_error "$var is missing or empty in .env"
            missing_vars=$((missing_vars + 1))
        else
            log_success "$var is set"
        fi
    done
    
    popd >/dev/null
    
    if [ $missing_vars -gt 0 ] || [ $incorrect_vars -gt 0 ]; then
        die "Environment validation failed: $missing_vars missing, $incorrect_vars incorrect"
    fi
    
    log_success "All environment variables are correctly set"
    return 0
}

main "$@" 