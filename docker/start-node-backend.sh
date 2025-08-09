#!/bin/bash

# Neural Symphony - Node.js Backend Startup Script
# Starts the API server and WebSocket handler

set -e

echo "[NODE-BACKEND] Starting Neural Symphony Node.js Backend..."

# Wait for AI backend to be ready
echo "[NODE-BACKEND] Waiting for AI backend to be ready..."
until curl -f http://127.0.0.1:8000/health > /dev/null 2>&1; do
    echo "[NODE-BACKEND] AI backend not ready, waiting 5 seconds..."
    sleep 5
done

echo "[NODE-BACKEND] AI backend is ready!"

# Set Node.js environment
export NODE_ENV=production
export PORT=3001
export WS_PORT=3002
export AI_BACKEND_URL=http://127.0.0.1:8000

echo "[NODE-BACKEND] Starting Node.js server on ports 3001 (API) and 3002 (WebSocket)..."

# Start the Node.js backend
cd /app
node src/backend/server.js