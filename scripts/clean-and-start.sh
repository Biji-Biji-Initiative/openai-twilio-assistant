#!/bin/bash

# Exit on error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status messages
print_status() {
    echo -e "${GREEN}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is required but not installed."
        exit 1
    fi
}

# Function to check if directory exists
check_directory() {
    local dir=$1
    if [ ! -d "$dir" ]; then
        print_error "Required directory '$dir' does not exist!"
        print_error "Please ensure all required packages are present:"
        print_error "- shared"
        print_error "- websocket-server"
        print_error "- webapp"
        exit 1
    fi
}

# Check required dependencies
print_status "📋 Checking dependencies..."
check_command "node"
check_command "npm"
check_command "lsof"

# Check required directories
print_status "📋 Checking required directories..."
check_directory "shared"
check_directory "websocket-server"
check_directory "webapp"

# Function to kill process using a port
kill_port() {
    local port=$1
    local service=$2
    local pid=$(lsof -ti :$port)
    if [ ! -z "$pid" ]; then
        print_status "Killing $service on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
    fi
}

print_status "🧹 Cleaning up processes and build artifacts..."

# Kill any existing processes
print_status "📍 Killing existing processes..."
kill_port 3000 "Frontend"
kill_port 3001 "Dev Phone"
kill_port 8081 "WebSocket Server"
kill_port 4040 "Ngrok Interface"

# Kill ngrok if running
print_status "📍 Killing ngrok processes..."
pkill -f ngrok 2>/dev/null || true

print_status "🗑️  Cleaning build artifacts..."

# Remove TypeScript build info files
find . -name "*.tsbuildinfo" -type f -delete

# Remove logs but keep directories
find . -name "*.log" -type f -delete

# Remove Next.js build output
rm -rf webapp/.next 2>/dev/null || true

# Remove macOS system files
find . -name ".DS_Store" -type f -delete

# Remove backup env files
rm -f webapp/.env\ copy 2>/dev/null || true

# Remove dist directories
find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true

print_status "🏗️  Installing dependencies..."

# Install dependencies in shared package
print_status "📦 Installing dependencies in shared package..."
(cd shared && npm install) || {
    print_error "Failed to install dependencies in shared package"
    exit 1
}

# Build shared package first
print_status "📦 Building shared package..."
(cd shared && \
 rm -rf dist && \
 npm install && \
 npx tsc -p tsconfig.build.json) || {
    print_error "Failed to build shared package"
    exit 1
}

# Create a temporary package.json for websocket-server without @twilio/shared
print_status "📦 Preparing websocket-server dependencies..."
(cd websocket-server && cp package.json package.json.bak && \
 jq 'del(.dependencies["@twilio/shared"])' package.json.bak > package.json && \
 npm install && \
 mv package.json.bak package.json) || {
    print_error "Failed to install dependencies in websocket-server"
    exit 1
}

# Install dependencies in webapp
print_status "📦 Installing dependencies in webapp..."
(cd webapp && cp package.json package.json.bak && \
 jq 'del(.dependencies["@twilio/shared"])' package.json.bak > package.json && \
 npm install && \
 mv package.json.bak package.json) || {
    print_error "Failed to install dependencies in webapp"
    exit 1
}

print_status "🔗 Linking local packages..."
(cd shared && npm link) || {
    print_error "Failed to create shared package link"
    exit 1
}

(cd websocket-server && npm link @twilio/shared) || {
    print_error "Failed to link shared package in websocket-server"
    exit 1
}

(cd webapp && npm link @twilio/shared) || {
    print_error "Failed to link shared package in webapp"
    exit 1
}

print_status "🏗️  Building dependent packages..."

# Build websocket-server
print_status "📦 Building websocket-server..."
(cd websocket-server && npm run build) || {
    print_error "Failed to build websocket-server"
    exit 1
}

# Build webapp
print_status "📦 Building webapp..."
(cd webapp && npm run build) || {
    print_error "Failed to build webapp"
    exit 1
}

print_status "🚀 Starting services..."

# Function to start a service
start_service() {
    local dir=$1
    local name=$2
    local port=$3
    
    print_status "🚀 Starting $name..."
    (cd $dir && npm run dev) &
    
    # Wait for port to be available
    local attempts=0
    local max_attempts=30
    while ! lsof -i :$port >/dev/null 2>&1; do
        sleep 1
        attempts=$((attempts + 1))
        if [ $attempts -ge $max_attempts ]; then
            print_error "$name failed to start (timeout waiting for port $port)"
            exit 1
        fi
        echo -n "."
    done
    echo ""
    print_status "✅ $name is running on port $port"
}

# Start services in the correct order
start_service "websocket-server" "WebSocket Server" 8081
start_service "webapp" "Frontend" 3000

print_status "✨ All services started successfully!"
echo -e "
${GREEN}Services running on:${NC}
- Frontend: ${YELLOW}http://localhost:3000${NC}
- WebSocket Server: ${YELLOW}http://localhost:8081${NC}

${YELLOW}Press Ctrl+C to stop all services${NC}
"

# Trap Ctrl+C
trap 'print_status "Stopping all services..."; pkill -P $$; exit 0' INT

# Wait for all background processes
wait 