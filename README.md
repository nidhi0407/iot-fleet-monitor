# PulseGrid: IoT Fleet Monitor

A live dashboard that monitors a fleet of IoT devices over MQTT, detects
anomalies (temperature spikes, devices going silent), and surfaces alerts in
real time. It runs with simulated devices out of the box, and a real board
can join by publishing the same message.

```
device or simulator  --MQTT-->  backend (FastAPI)  --REST-->  frontend (Next.js)
                                (subscribes, stores,           (live dashboard)
                                 detects anomalies)
```

## How a reading travels

1. A device publishes a JSON message to the broker on `devices/<device_id>/telemetry`.
2. `backend/mqtt_listener.py` receives it, stores a row, and compares it with
   that device's recent readings. A spike creates a `temperature_spike` alert.
3. `backend/offline.py` runs every 10 seconds and creates a `device_offline`
   alert for any device that has stopped reporting.
4. The dashboard polls the REST API every 4 seconds and shows devices, charts and alerts.

MQTT is the only way readings get in. Stop the simulator and the dashboard
goes quiet, then the devices flip to offline.

## Project structure

```
iot-fleet-monitor/
├── simulator/             # pretends to be 5 IoT devices, publishes over MQTT
│   └── simulate_devices.py
├── backend/               # FastAPI service: MQTT listener + REST API + DB
│   ├── main.py            # API routes and startup
│   ├── mqtt_listener.py   # receives and stores readings
│   ├── anomaly.py         # temperature spike rule
│   ├── offline.py         # device-offline rule
│   ├── timeutil.py        # timestamp helpers (everything is stored as UTC)
│   ├── auth.py            # login tokens
│   ├── auth_routes.py     # Google sign-in
│   ├── models.py
│   ├── database.py
│   └── tests/
├── frontend/              # Next.js live dashboard
│   ├── app/
│   └── components/
├── docker-compose.yml     # one-command MQTT broker
└── mosquitto.conf
```

## Running it locally

You'll need: Python 3.10+, Node 18+, and Docker (for the MQTT broker, or
install Mosquitto natively if you'd rather skip Docker).

**1. Start the MQTT broker**

```bash
docker compose up -d
```

**2. Configure and start the backend**

```bash
cd backend
python -m venv venv && source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env                               # then fill in the values
uvicorn main:app --reload --port 8000
```

`.env.example` explains each setting. You need a database URL (Postgres, or
SQLite for a quick try), a `JWT_SECRET_KEY`, and Google OAuth credentials for
sign-in. The tables are created automatically on first start.

You should see `MQTT listener connected to localhost:1883` in the terminal.

**3. Start the simulator** (in a new terminal)

```bash
cd simulator
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python simulate_devices.py
```

You should see it printing fake readings every 3 seconds.

**4. Start the dashboard** (in a new terminal)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` and sign in with Google. You should see 5
devices with live-updating temperatures, and `device-03` (deliberately faulty
in the simulator) occasionally flipping to ANOMALY with an alert in the panel.
Stop the simulator and, about 30 seconds later, every device shows offline
with a `device_offline` alert.

## Running the tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

The tests use a throwaway in-memory database, so they need no broker,
Postgres or `.env` file.

## Connecting a real device

Any device that can speak MQTT can join. Publish to
`devices/<device_id>/telemetry` (the device ID comes from the topic):

```json
{"temperature_c": 4.2}
```

Only `temperature_c` is required. Optional fields:

| Field | Meaning |
|---|---|
| `battery_pct` | Battery level. Leave it out on USB power. |
| `location` | A label shown on the dashboard. |
| `timestamp` | ISO 8601 time of the reading. Leave it out and the server uses the arrival time, which suits a board with no clock. |

Two settings matter once a real board is involved:

- `MQTT_BROKER_HOST` in `.env`, if the broker is not on the same machine as the backend.
- `OFFLINE_THRESHOLD_SECONDS`, which should be a few times the device's
  reporting interval. The default of 25 suits the simulator's 3 seconds; a
  board reporting once a minute needs something like 180.

The broker in this repo accepts anonymous connections (`mosquitto.conf`),
which is fine on your own laptop. Before putting it on a shared network or
the internet, give each device a username and password.

## How the anomaly detection works

Intentionally simple to start: each device is compared against its own
recent rolling average (not a single global threshold), so a cold-storage
unit running at 4°C isn't flagged just for being cold — only for deviating
from *its own* normal range. See `backend/anomaly.py`. This is a legitimate
MVP approach; a natural next step is swapping in a z-score or a small
`scikit-learn` IsolationForest model without changing anything else in the
pipeline.

## Ideas to extend it

- Replace one simulated device with a real ESP32 and a temperature probe
- Send alerts to a phone (SMS or WhatsApp) so nobody has to watch the dashboard
- Add a door sensor and compressor power reading, and warn before the temperature rises
- Swap the threshold check for a z-score or a trained anomaly model
- Deploy the backend and frontend so it's a live public demo
