#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

echo "=== FreshFlow Inventory Publish ==="

# Kill any existing process on port 3000
sudo sh -c 'lsof -t -iTCP:3000 -sTCP:LISTEN | xargs -r kill' 2>/dev/null || true

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Build frontend
echo "Building frontend..."
npx vite build

# Start server in background
echo "Starting server on port 3000..."
nohup node server/index.js > .run/server.log 2>&1 &

echo "=== Publish complete! ==="
echo "Server PID: $!"
echo "Check .run/server.log for output"