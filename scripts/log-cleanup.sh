#!/bin/bash

# Configuration
LOG_DIR="logs"
MAX_LOG_AGE_DAYS=7
MAX_LOG_SIZE_MB=100
ROTATE_SIZE_MB=10

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to rotate a log file if it exceeds MAX_LOG_SIZE_MB
rotate_if_needed() {
    local file="$1"
    local size_mb=$(du -m "$file" | cut -f1)
    
    if [ "$size_mb" -gt "$MAX_LOG_SIZE_MB" ]; then
        echo "Rotating $file (size: ${size_mb}MB)"
        mv "$file" "${file}.$(date +%Y%m%d-%H%M%S)"
        touch "$file"
        chmod 644 "$file"
    fi
}

# Rotate current log files if they're too large
for log_file in "$LOG_DIR"/*.log; do
    if [ -f "$log_file" ]; then
        rotate_if_needed "$log_file"
    fi
done

# Remove old rotated logs
find "$LOG_DIR" -name "*.log.*" -type f -mtime +"$MAX_LOG_AGE_DAYS" -delete

# Compress logs older than 1 day
find "$LOG_DIR" -name "*.log.*" -type f -mtime +1 -not -name "*.gz" -exec gzip {} \;

# Create symbolic links for current logs if they don't exist
for service in "websocket-server" "webapp" "dev-phone"; do
    for level in "error" "combined"; do
        log_file="$LOG_DIR/${service}-${level}.log"
        if [ ! -f "$log_file" ]; then
            touch "$log_file"
            chmod 644 "$log_file"
        fi
    done
done

echo "Log cleanup completed successfully" 