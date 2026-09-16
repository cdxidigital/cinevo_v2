#!/bin/sh
# Startup script for Cinevo v2 preview server
# Runs on workspace revival/reboot — must be idempotent & non-blocking
# Binds to 0.0.0.0:8080 (required by preview proxy)

set -e

cd /workspace

# Stop any orphaned preview server
node scripts/preview.mjs stop || true

# Health check: if server already running, exit 0 (idempotent)
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/ 2>/dev/null; then
  echo "[startup] Dev server already running on :8080"
  exit 0
fi

echo "[startup] Starting dev server on 0.0.0.0:8080..."

# Start dev server in background with logging
# Note: MUST use 'npm run dev' (not 'vite dev') to include env wrapper
npm run dev >> /tmp/app-startup.log 2>&1 &
SERVER_PID=$!

# Wait for server to be ready (up to 30s)
echo "[startup] Waiting for server health check..."
for attempt in $(seq 1 30); do
  if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/ 2>/dev/null; then
    echo "[startup] Server ready on http://0.0.0.0:8080"
    exit 0
  fi
  echo "[startup] Attempt $attempt/30: waiting for server..."
  sleep 1
done

echo "[startup] Server startup timeout after 30s. Check /tmp/app-startup.log" >&2
kill $SERVER_PID 2>/dev/null || true
exit 1
