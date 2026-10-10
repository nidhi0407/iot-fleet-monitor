"""
mqtt_listener.py

Runs in the background inside the FastAPI app. Subscribes to
devices/+/telemetry (the '+' is an MQTT wildcard meaning "any device ID"),
and for every incoming message: saves it to the database, checks it for
anomalies, and creates an Alert row if something looks wrong.

This is the piece that turns raw MQTT messages into rows a dashboard can
actually query. It is the only way readings enter the system, whether they
come from the simulator or from a real board.

Message format, published to devices/<device_id>/telemetry:

    {"temperature_c": 4.2}                      <- the minimum a device must send
    {"temperature_c": 4.2, "battery_pct": 87.5,
     "location": "Pharmacy fridge", "timestamp": "2026-10-10T16:00:00+00:00"}
"""

import json
import os
from typing import Optional

import paho.mqtt.client as mqtt
from dotenv import load_dotenv

from anomaly import ROLLING_WINDOW, is_temperature_anomaly
from database import SessionLocal
from models import Alert, Device, Reading
from timeutil import parse_device_timestamp, utc_now

load_dotenv()

BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", "1883"))
BROKER_USERNAME = os.getenv("MQTT_USERNAME")
BROKER_PASSWORD = os.getenv("MQTT_PASSWORD")
TOPIC = "devices/+/telemetry"


def device_id_from_topic(topic: str) -> Optional[str]:
    """devices/fridge-01/telemetry -> fridge-01. Returns None for any other shape."""
    parts = topic.split("/")
    if len(parts) == 3 and parts[0] == "devices" and parts[2] == "telemetry" and parts[1]:
        return parts[1]
    return None


def _as_number(value) -> Optional[float]:
    """Accept ints and floats, reject everything else (including true/false)."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value)


def handle_message(db, device_id: str, payload: dict, received_at=None) -> Optional[Reading]:
    """
    Store one reading and raise an alert if it is anomalous.

    received_at is the server's clock at arrival. It always drives "last seen",
    so a device with a wrong clock cannot look online or offline by mistake.
    Returns the saved Reading, or None if the message was unusable.
    """
    received_at = received_at or utc_now()

    temperature = _as_number(payload.get("temperature_c"))
    if temperature is None:
        print(f"Ignoring message from {device_id}: no numeric temperature_c")
        return None

    # Battery is optional: a board on USB power has none to report.
    battery = _as_number(payload.get("battery_pct"))

    # Trust the device's own timestamp if it sent a readable one.
    timestamp = parse_device_timestamp(payload.get("timestamp")) or received_at

    # Upsert the device record (create it the first time we hear from it).
    device = db.get(Device, device_id)
    if device is None:
        device = Device(id=device_id, location=payload.get("location") or "unknown")
        db.add(device)
    elif payload.get("location"):
        device.location = payload["location"]
    device.last_seen = received_at

    # Check the new reading against this device's own recent history.
    recent = (
        db.query(Reading)
        .filter(Reading.device_id == device_id)
        .order_by(Reading.timestamp.desc())
        .limit(ROLLING_WINDOW)
        .all()
    )
    recent_temps = [r.temperature_c for r in reversed(recent)]
    anomaly = is_temperature_anomaly(recent_temps, temperature)

    reading = Reading(
        device_id=device_id,
        temperature_c=temperature,
        battery_pct=battery,
        timestamp=timestamp,
        is_anomaly=anomaly,
    )
    db.add(reading)

    if anomaly:
        db.add(Alert(device_id=device_id, reason="temperature_spike", created_at=received_at))
        print(f"[ALERT] {device_id} temperature spike: {temperature}°C")

    db.commit()
    return reading


def _on_message(client, userdata, msg):
    device_id = device_id_from_topic(msg.topic)
    if device_id is None:
        return

    db = SessionLocal()
    try:
        payload = json.loads(msg.payload.decode())
        if not isinstance(payload, dict):
            raise ValueError("payload is not a JSON object")
        handle_message(db, device_id, payload)
    except Exception as exc:  # noqa: BLE001 - log and keep listening
        db.rollback()
        print(f"Failed to process message on {msg.topic}: {exc}")
    finally:
        db.close()


def _on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"MQTT listener connected to {BROKER_HOST}:{BROKER_PORT}, subscribing to {TOPIC}")
        # Subscribing here (not once at startup) means we resubscribe
        # automatically after every reconnect.
        client.subscribe(TOPIC)
    else:
        print(f"MQTT listener could not connect (rc={rc})")


def start_mqtt_listener():
    """
    Starts the MQTT listener on a background thread so it doesn't block FastAPI.

    connect_async + loop_start means the app still starts if the broker is
    down, and paho keeps retrying until the broker comes back.
    """
    client = mqtt.Client(client_id="fleet-backend", protocol=mqtt.MQTTv5)
    client.on_connect = _on_connect
    client.on_message = _on_message
    if BROKER_USERNAME:
        client.username_pw_set(BROKER_USERNAME, BROKER_PASSWORD)
    client.reconnect_delay_set(min_delay=1, max_delay=30)

    client.connect_async(BROKER_HOST, BROKER_PORT, keepalive=60)
    client.loop_start()
    return client


def stop_mqtt_listener(client):
    client.loop_stop()
    client.disconnect()
