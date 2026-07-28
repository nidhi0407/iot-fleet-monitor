# IoT Fleet Monitor

A live dashboard that monitors a fleet of simulated IoT devices over MQTT,
detects anomalies (temperature spikes, dropped connections), and surfaces
alerts in real time — without needing any physical hardware.

```
simulator  --MQTT-->  backend (FastAPI)  --REST-->  frontend (Next.js)
(fake devices)        (subscribes, stores,           (live dashboard)
                        detects anomalies)
```

## Why this project

Built to demonstrate the exact pattern real IoT products use: devices publish
telemetry, a backend ingests and reasons about it, a dashboard shows it live.
It touches connectivity (MQTT), backend/software development (FastAPI +
SQLAlchemy), and lightweight anomaly detection — all without requiring
physical hardware, since the "devices" are simulated in software.

## Project structure

```
iot-fleet-monitor/
├── simulator/            # pretends to be 5 IoT devices, publishes over MQTT
│   └── simulate_devices.py
├── backend/               # FastAPI service: MQTT listener + REST API + DB
│   ├── main.py
│   ├── mqtt_listener.py
│   ├── anomaly.py
│   ├── models.py
│   └── database.py
├── frontend/              # Next.js live dashboard
│   ├── app/
│   └── components/
├── docker-compose.yml      # one-command MQTT broker
└── mosquitto.conf
```

## Running it locally

You'll need: Python 3.10+, Node 18+, and Docker (for the MQTT broker — or
install Mosquitto natively if you'd rather skip Docker).

**1. Start the MQTT broker**

```bash
docker compose up -d
```

**2. Start the backend**

```bash
cd backend
python -m venv venv && source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

This creates `fleet.db` (SQLite) automatically and starts listening for
MQTT messages in the background.

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

Open `http://localhost:3000` — you should see 5 devices, live-updating
temperatures, and `device-03` (deliberately faulty in the simulator)
occasionally flipping to ANOMALY with an alert appearing in the panel.

## How the anomaly detection works

Intentionally simple to start: each device is compared against its own
recent rolling average (not a single global threshold), so a cold-storage
unit running at 4°C isn't flagged just for being cold — only for deviating
from *its own* normal range. See `backend/anomaly.py`. This is a legitimate
MVP approach; a natural next step is swapping in a z-score or a small
`scikit-learn` IsolationForest model without changing anything else in the
pipeline.

## Ideas to extend it

- Swap the threshold check for a real trained anomaly model
- Add a mock OTA "firmware version" field per device and a rollout status page
- Deploy the backend + frontend (Render/Railway + Vercel) so it's a live public demo
- Replace one simulated device with a real ESP32 + a cheap temp sensor over WiFi
# iot-fleet-monitor
