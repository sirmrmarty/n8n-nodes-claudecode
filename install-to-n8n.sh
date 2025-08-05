#!/usr/bin/bash

# Install script for n8n-nodes-claudecode
# This script installs the custom node to n8n's custom nodes directory

set -e

echo "Installing n8n-nodes-claudecode..."

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "nodes" ]; then
    echo "Error: This script must be run from the n8n-nodes-claudecode project root"
    exit 1
fi

# Build the project
echo "Building the project..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "Error: Build failed - dist directory not found"
    exit 1
fi

# Define the target directory - use current user's home if /home/node doesn't exist
if [ -d "/home/node" ] && [ -w "/home/node" ]; then
    N8N_CUSTOM_DIR="/home/node/.n8n/custom"
else
    N8N_CUSTOM_DIR="$HOME/.n8n/custom"
fi
TARGET_DIR="$N8N_CUSTOM_DIR/n8n-nodes-claudecode"

# Create custom directory if it doesn't exist
mkdir -p "$N8N_CUSTOM_DIR"

# Remove existing installation if present
if [ -d "$TARGET_DIR" ]; then
    echo "Removing existing installation..."
    rm -rf "$TARGET_DIR"
fi

# Create target directory
mkdir -p "$TARGET_DIR"

# Copy necessary files
echo "Copying files to n8n custom directory..."
cp -r dist/* "$TARGET_DIR/"
cp package.json "$TARGET_DIR/"
cp index.js "$TARGET_DIR/"

# Install dependencies in target directory
echo "Installing dependencies..."
cd "$TARGET_DIR"
npm install --production --no-optional

echo "✅ Installation complete!"
echo ""
echo "The Claude Code node should now be available in n8n."
echo "Restart n8n to load the new node."
echo ""
echo "To verify installation:"
echo "  ls -la $TARGET_DIR"
echo ""
echo "The node will appear in n8n under the 'Claude Code' category."