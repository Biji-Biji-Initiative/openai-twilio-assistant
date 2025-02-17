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