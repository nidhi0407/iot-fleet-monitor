"""
simulate_devices.py

Pretends to be a small fleet of IoT devices (like ESP32 boards) sending
sensor readings over MQTT. This stands in for real hardware so you can
build and demo the whole pipeline without owning any physical devices.

Each fake device publishes a JSON payload every few seconds to its own
MQTT topic: devices/<device_id>/telemetry

Run this AFTER you have an MQTT broker running (see README.md for how
to start one with Docker in about 10 seconds).
"""

import json
import os
import random
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

# ---- Config ---------------------------------------------------------------

BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", "1883"))
PUBLISH_INTERVAL_SECONDS = 3

DEVICES = [
    {"id": "device-01", "location": "Warehouse A - Shelf 1", "base_temp": 24},
    {"id": "device-02", "location": "Warehouse A - Shelf 2", "base_temp": 25},
    {"id": "device-03", "location": "Warehouse B - Dock", "base_temp": 27},
    {"id": "device-04", "location": "Warehouse B - Cold Storage", "base_temp": 4},
    {"id": "device-05", "location": "Warehouse C - Loading Bay", "base_temp": 26},
]

# One device will misbehave on purpose so your anomaly detection has
# something real to catch during a demo.
FAULTY_DEVICE_ID = "device-03"


def generate_reading(device):
    """Build one fake sensor reading for a device."""
    base_temp = device["base_temp"]

    # Normal devices drift slightly around their base temperature.
    temp = base_temp + random.uniform(-1.5, 1.5)

    # The faulty device occasionally spikes hard, to simulate a real fault
    # (e.g. a fridge door left open, a sensor fault, overheating hardware).
    if device["id"] == FAULTY_DEVICE_ID and random.random() < 0.08:
        temp += random.uniform(15, 30)

    return {
        "device_id": device["id"],
        "location": device["location"],
        "temperature_c": round(temp, 2),
        "battery_pct": round(random.uniform(55, 100), 1),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def main():
    client = mqtt.Client(client_id="fleet-simulator", protocol=mqtt.MQTTv5)
    client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
    client.loop_start()

    print(f"Simulator connected to {BROKER_HOST}:{BROKER_PORT}")
    print(f"Publishing for {len(DEVICES)} devices every {PUBLISH_INTERVAL_SECONDS}s. Ctrl+C to stop.\n")

    try:
        while True:
            for device in DEVICES:
                # device-05 randomly "goes offline" for a bit, to simulate
                # a device losing connectivity -- another thing your
                # dashboard should be able to detect and flag.
                if device["id"] == "device-05" and random.random() < 0.15:
                    print(f"[{device['id']}] simulating dropped connection, skipping publish")
                    continue

                reading = generate_reading(device)
                topic = f"devices/{device['id']}/telemetry"
                client.publish(topic, json.dumps(reading))
                print(f"[{device['id']}] {reading['temperature_c']}°C  battery={reading['battery_pct']}%")

            time.sleep(PUBLISH_INTERVAL_SECONDS)
    except KeyboardInterrupt:
        print("\nStopping simulator.")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
