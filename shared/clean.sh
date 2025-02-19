#!/bin/bash

echo "Cleaning build artifacts..."

# Remove TypeScript build info files
rm -f *.tsbuildinfo

# Remove dist directory
rm -rf dist

# Remove any cached files
rm -rf .cache

echo "Build artifacts cleaned!" 