#!/bin/bash

echo "Cleaning up processes..."

# Function to kill process using a port
kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port)
    if [ ! -z "$pid" ]; then
        echo "Killing process on port $port (PID: $pid)"
        kill -9 $pid
    fi
}

# Kill any existing ngrok processes
echo "Killing ngrok processes..."
pkill -f ngrok

# Kill processes on all used ports
kill_port 3000  # Frontend
kill_port 3001  # Dev Phone
kill_port 8081  # WebSocket Server
kill_port 4040  # Ngrok Interface

echo "Cleanup complete!"

# Remove TypeScript build info files
find . -name "*.tsbuildinfo" -type f -delete

# Remove logs
rm -f *.log
rm -f websocket-server/logs/*.log
rm -f webapp/logs/*.log

# Remove Next.js build output
rm -rf webapp/.next

# Remove macOS system files
find . -name ".DS_Store" -type f -delete

# Remove backup env files
rm -f webapp/.env\ copy

# Remove dist directories
find . -name "dist" -type d -exec rm -rf {} +

# Remove node_modules (optional - uncomment if needed)
# find . -name "node_modules" -type d -exec rm -rf {} +

echo "Cleanup complete!"

# Print total size saved
echo "Current repository size:"
du -sh .

echo "Note: Run 'git clean -fdx' to remove all untracked files and directories if needed." 