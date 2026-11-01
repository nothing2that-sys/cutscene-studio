#!/usr/bin/env sh
set -e
DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
cd "$DIR"
npm install
npm run build
npm run dev -- --host &
DEV_PID=$!
sleep 4
if command -v open >/dev/null 2>&1; then
  open "http://localhost:5173"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://localhost:5173"
fi
wait "$DEV_PID"
