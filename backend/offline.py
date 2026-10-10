"""
offline.py

A device that stops reporting is a problem too: the fridge may be fine, or the
power may be out. This module decides when a device counts as offline and
raises one "device_offline" alert per outage.
"""

import os

from models import Alert, Device
from timeutil import to_naive_utc

# A device is offline once it has been silent for this long. Set it to a few
# times the device's reporting interval (the simulator reports every 3 seconds).
OFFLINE_THRESHOLD_SECONDS = int(os.getenv("OFFLINE_THRESHOLD_SECONDS", "25"))

# How often the background task re-checks.
OFFLINE_CHECK_INTERVAL_SECONDS = 10

OFFLINE_REASON = "device_offline"


def is_online(last_seen, now) -> bool:
    if last_seen is None:
        return False
    silent_for = (to_naive_utc(now) - to_naive_utc(last_seen)).total_seconds()
    return silent_for < OFFLINE_THRESHOLD_SECONDS


def check_offline_devices(db, now) -> list[Alert]:
    """
    Create a device_offline alert for every device that has gone silent.

    Only one alert is raised per outage: if an offline alert already exists
    that is newer than the device's last message, nothing is added. That holds
    even after someone resolves the alert, so a long outage does not keep
    re-alerting. A new alert is raised only after the device has come back
    and gone silent again.
    """
    now = to_naive_utc(now)
    created = []

    for device in db.query(Device).all():
        if device.last_seen is None or is_online(device.last_seen, now):
            continue

        already_alerted = (
            db.query(Alert)
            .filter(
                Alert.device_id == device.id,
                Alert.reason == OFFLINE_REASON,
                Alert.created_at >= to_naive_utc(device.last_seen),
            )
            .first()
        )
        if already_alerted:
            continue

        alert = Alert(device_id=device.id, reason=OFFLINE_REASON, created_at=now)
        db.add(alert)
        created.append(alert)
        print(f"[ALERT] {device.id} is offline (last seen {device.last_seen})")

    if created:
        db.commit()
    return created
