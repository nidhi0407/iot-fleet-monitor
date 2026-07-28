"""
mqtt_listener.py

Runs in the background inside the FastAPI app. Subscribes to
devices/+/telemetry (the '+' is an MQTT wildcard meaning "any device ID"),
and for every incoming message: saves it to the database, checks it for
anomalies, and creates an Alert row if something looks wrong.

This is the piece that turns raw MQTT messages into rows a dashboard can
actually query.
"""

import json
import threading
from datetime import datetime

import paho.mqtt.client as mqtt

from anomaly import is_temperature_anomaly
from database import SessionLocal
from models import Alert, Device, Reading

BROKER_HOST = "localhost"
BROKER_PORT = 1883
TOPIC = "devices/+/telemetry"


def _handle_message(db, payload: dict):
    device_id = payload["device_id"]
    timestamp = datetime.fromisoformat(payload["timestamp"])

    # Upsert the device record (create it the first time we hear from it).
    device = db.get(Device, device_id)
    if device is None:
        device = Device(id=device_id, location=payload.get("location", "unknown"))
        db.add(device)
    device.last_seen = timestamp

    # Check the new reading against this device's own recent history.
    recent = (
        db.query(Reading)
        .filter(Reading.device_id == device_id)
        .order_by(Reading.timestamp.desc())
        .limit(10)
        .all()
    )
    recent_temps = [r.temperature_c for r in reversed(recent)]
    anomaly = is_temperature_anomaly(recent_temps, payload["temperature_c"])

    reading = Reading(
        device_id=device_id,
        temperature_c=payload["temperature_c"],
        battery_pct=payload["battery_pct"],
        timestamp=timestamp,
        is_anomaly=anomaly,
    )
    db.add(reading)

    if anomaly:
        db.add(Alert(device_id=device_id, reason="temperature_spike"))
        print(f"[ALERT] {device_id} temperature spike: {payload['temperature_c']}°C")

    db.commit()


def _on_message(client, userdata, msg):
    db = SessionLocal()
    try:
        payload = json.loads(msg.payload.decode())
        _handle_message(db, payload)
    except Exception as exc:  # noqa: BLE001 - log and keep listening
        print(f"Failed to process message on {msg.topic}: {exc}")
    finally:
        db.close()


def _on_connect(client, userdata, flags, rc, properties=None):
    print(f"MQTT listener connected (rc={rc}), subscribing to {TOPIC}")
    client.subscribe(TOPIC)


def start_mqtt_listener():
    """Starts the MQTT listener on a background thread so it doesn't block FastAPI."""
    client = mqtt.Client(client_id="fleet-backend", protocol=mqtt.MQTTv5)
    client.on_connect = _on_connect
    client.on_message = _on_message

    client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)

    thread = threading.Thread(target=client.loop_forever, daemon=True)
    thread.start()
    return client
