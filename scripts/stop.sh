#!/usr/bin/env bash
# Stop the local Velaroute server started by scripts/start.sh.
set -uo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-3300}"
if [ -f .run/server.pid ]; then
  PID="$(cat .run/server.pid)"
  pkill -P "$PID" 2>/dev/null; kill "$PID" 2>/dev/null && echo "Stopped Velaroute (pid $PID)"
  rm -f .run/server.pid
fi
# Fallback: anything still bound to the port
PIDS="$(lsof -ti tcp:"$PORT" 2>/dev/null || fuser "$PORT"/tcp 2>/dev/null || true)"
[ -n "$PIDS" ] && kill $PIDS 2>/dev/null && echo "Freed port $PORT"
exit 0
