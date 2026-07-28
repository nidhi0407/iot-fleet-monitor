"""
anomaly.py

Deliberately simple to start with: threshold + rolling-average checks
rather than a trained ML model. This is a legitimate MVP -- you can
explain exactly why a reading was flagged, which matters a lot in an
interview. Upgrade to something statistical (z-score) or a real model
(isolation forest) later once this works end-to-end.
"""

from statistics import mean, pstdev

# A reading is flagged if it's this many degrees away from the device's
# own recent average -- so each device is judged against its own normal
# range, not a single global threshold (device-04 is a cold-storage unit
# and is *supposed* to run near 4°C; device-01 is not).
DEVIATION_THRESHOLD_C = 8.0

# How many recent readings to use when computing a device's "normal" range.
ROLLING_WINDOW = 10


def is_temperature_anomaly(recent_temps: list[float], new_temp: float) -> bool:
    """
    recent_temps: the device's last N readings (not including the new one)
    new_temp: the incoming reading to check
    """
    if len(recent_temps) < 3:
        # Not enough history yet to judge -- assume normal.
        return False

    baseline = mean(recent_temps[-ROLLING_WINDOW:])
    return abs(new_temp - baseline) > DEVIATION_THRESHOLD_C


def seconds_since(last_seen, now) -> float:
    return (now - last_seen).total_seconds()
