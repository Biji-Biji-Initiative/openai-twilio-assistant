#!/bin/bash

echo "Cleaning build artifacts and logs..."

# Remove TypeScript build info files
find . -name "*.tsbuildinfo" -type f -delete

# Remove logs (but keep the log directories)
find . -name "*.log" -type f -delete

# Remove Next.js build output
rm -rf webapp/.next

# Remove macOS system files
find . -name ".DS_Store" -type f -delete

# Remove backup env files
rm -f webapp/.env\ copy

# Remove dist directories
find . -name "dist" -type d -exec rm -rf {} +

echo "Cleanup complete!"

# Print total size saved
echo "Current repository size:"
du -sh .

echo "Note: Your environment variables and configurations are preserved." 