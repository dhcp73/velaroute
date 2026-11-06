#!/usr/bin/env bash
# Build (if needed) and start Velaroute locally on port 3300 with SQLite storage.
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-3300}"
mkdir -p .run data
if [ -f .run/server.pid ] && kill -0 "$(cat .run/server.pid)" 2>/dev/null; then
  echo "Velaroute already running (pid $(cat .run/server.pid)) on http://localhost:$PORT"; exit 0
fi
export STORAGE_MODE="${STORAGE_MODE:-sqlite}"
export SESSION_SECRET="${SESSION_SECRET:-$(cat .run/secret 2>/dev/null || (openssl rand -hex 32 | tee .run/secret))}"
export PUBLIC_URL="${PUBLIC_URL:-http://localhost:$PORT}"
if [ ! -f .next/BUILD_ID ] || [ "$(cat .run/build-mode 2>/dev/null)" != "$STORAGE_MODE" ] || [ "${REBUILD:-0}" = "1" ]; then
  echo "Building ($STORAGE_MODE)…"; npx next build >.run/build.log 2>&1 || { tail -40 .run/build.log; exit 1; }
  echo "$STORAGE_MODE" > .run/build-mode
fi
nohup npx next start -p "$PORT" >.run/server.log 2>&1 &
echo $! > .run/server.pid
for _ in $(seq 1 60); do curl -fs "http://localhost:$PORT/api/health" >/dev/null 2>&1 && break; sleep 1; done
echo "Velaroute running on http://localhost:$PORT (pid $(cat .run/server.pid)) — logs: .run/server.log"
echo "Demo login: demo@velaroute.dev / demo1234 · Admin: admin@velaroute.dev / admin1234"
