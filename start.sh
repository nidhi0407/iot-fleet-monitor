#!/bin/bash
# start.sh - runs all of PulseGrid in one terminal.
#
#   ./start.sh          start broker, backend, simulator and dashboard
#   Ctrl+C              stop all of them
#
# Each part writes to its own file in logs/, so if something misbehaves you
# can open logs/backend.log (and so on) to see what it said.

cd "$(dirname "$0")" || exit 1
mkdir -p logs
rm -f logs/*.log

if [ ! -f .venv/bin/activate ]; then
  echo "No .venv folder found. Create it with: python3 -m venv .venv"; exit 1
fi
source .venv/bin/activate

# Stop everything this script started when you press Ctrl+C.
cleanup() { trap - INT TERM EXIT; echo; echo "Stopping everything..."; kill 0; }
trap cleanup INT TERM EXIT

port_in_use() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

wait_for_port() {  # wait_for_port <port> <seconds>
  for _ in $(seq 1 "$2"); do port_in_use "$1" && return 0; sleep 1; done
  return 1
}

# --- 1. Broker -------------------------------------------------------------
if port_in_use 1883; then
  echo "[broker]    already running on port 1883, using that one"
else
  MOSQUITTO="$(command -v mosquitto)"
  [ -z "$MOSQUITTO" ] && MOSQUITTO="$(brew --prefix 2>/dev/null)/sbin/mosquitto"
  if [ ! -x "$MOSQUITTO" ]; then
    echo "[broker]    Mosquitto is not installed. Run: brew install mosquitto"; exit 1
  fi
  # Local-only broker: other people on the same Wi-Fi cannot connect to it.
  # A real board on your Wi-Fi will need "listener 1883" without the address.
  printf 'listener 1883 127.0.0.1\nallow_anonymous true\n' > logs/mosquitto-local.conf
  "$MOSQUITTO" -c logs/mosquitto-local.conf -v > logs/broker.log 2>&1 &
  if wait_for_port 1883 10; then
    echo "[broker]    running on port 1883"
  else
    echo "[broker]    FAILED to start. Last lines of logs/broker.log:"; tail -5 logs/broker.log; exit 1
  fi
fi

# --- 2. Backend ------------------------------------------------------------
if port_in_use 8000; then
  echo "[backend]   port 8000 is already in use. Close the other backend first."; exit 1
fi
(cd backend && PYTHONUNBUFFERED=1 exec uvicorn main:app --port 8000) > logs/backend.log 2>&1 &
if wait_for_port 8000 30; then
  echo "[backend]   running on http://127.0.0.1:8000"
else
  echo "[backend]   FAILED to start. Last lines of logs/backend.log:"; tail -15 logs/backend.log; exit 1
fi

# --- 3. Simulator ----------------------------------------------------------
PYTHONUNBUFFERED=1 python simulator/simulate_devices.py > logs/simulator.log 2>&1 &
echo "[simulator] publishing 5 fake devices every 3 seconds"

# --- 4. Dashboard ----------------------------------------------------------
if port_in_use 3000; then
  echo "[dashboard] already running on http://localhost:3000"
else
  (cd frontend && exec npm run dev) > logs/dashboard.log 2>&1 &
  if wait_for_port 3000 60; then
    echo "[dashboard] running on http://localhost:3000"
  else
    echo "[dashboard] FAILED to start. Last lines of logs/dashboard.log:"; tail -15 logs/dashboard.log
  fi
fi

echo
echo "Everything is up. Open http://localhost:3000"
echo "Press Ctrl+C here to stop it all. Backend messages follow:"
echo
tail -n +1 -f logs/backend.log
