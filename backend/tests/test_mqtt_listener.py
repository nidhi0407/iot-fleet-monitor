from datetime import datetime, timedelta

from models import Alert, Device, Reading
from mqtt_listener import device_id_from_topic, handle_message

NOW = datetime(2026, 10, 10, 12, 0, 0)


def test_device_id_comes_from_the_topic():
    assert device_id_from_topic("devices/fridge-01/telemetry") == "fridge-01"
    assert device_id_from_topic("devices//telemetry") is None
    assert device_id_from_topic("devices/fridge-01/status") is None
    assert device_id_from_topic("other/fridge-01/telemetry") is None


def test_minimal_message_from_a_real_board_is_stored(db):
    # A board with no battery and no clock sends only a temperature.
    reading = handle_message(db, "fridge-01", {"temperature_c": 4.2}, received_at=NOW)

    assert reading is not None
    assert reading.temperature_c == 4.2
    assert reading.battery_pct is None
    assert reading.timestamp == NOW

    device = db.get(Device, "fridge-01")
    assert device.location == "unknown"
    assert device.last_seen == NOW


def test_full_message_from_the_simulator_is_stored(db):
    payload = {
        "device_id": "ignored-the-topic-wins",
        "location": "Warehouse B - Cold Storage",
        "temperature_c": 4,
        "battery_pct": 87.5,
        "timestamp": "2026-10-10T17:29:30+05:30",
    }
    reading = handle_message(db, "device-04", payload, received_at=NOW)

    assert reading.device_id == "device-04"
    assert reading.battery_pct == 87.5
    # 17:29:30 in India is 11:59:30 UTC.
    assert reading.timestamp == datetime(2026, 10, 10, 11, 59, 30)
    assert db.get(Device, "device-04").location == "Warehouse B - Cold Storage"


def test_last_seen_uses_the_server_clock_not_the_device_clock(db):
    payload = {"temperature_c": 4.0, "timestamp": "2020-01-01T00:00:00+00:00"}
    handle_message(db, "fridge-01", payload, received_at=NOW)

    assert db.get(Device, "fridge-01").last_seen == NOW


def test_unreadable_timestamp_falls_back_to_arrival_time(db):
    reading = handle_message(
        db, "fridge-01", {"temperature_c": 4.0, "timestamp": "not a time"}, received_at=NOW
    )
    assert reading.timestamp == NOW


def test_message_without_a_numeric_temperature_is_dropped(db):
    for bad in ({}, {"temperature_c": "warm"}, {"temperature_c": None}, {"temperature_c": True}):
        assert handle_message(db, "fridge-01", bad, received_at=NOW) is None

    assert db.query(Reading).count() == 0
    assert db.get(Device, "fridge-01") is None


def test_spike_raises_exactly_one_alert(db):
    for i, temp in enumerate([4.0, 4.1, 3.9, 4.2]):
        handle_message(db, "fridge-01", {"temperature_c": temp}, received_at=NOW + timedelta(seconds=3 * i))
    assert db.query(Alert).count() == 0

    spike = handle_message(db, "fridge-01", {"temperature_c": 19.5}, received_at=NOW + timedelta(seconds=12))

    assert spike.is_anomaly is True
    alerts = db.query(Alert).all()
    assert len(alerts) == 1
    assert alerts[0].device_id == "fridge-01"
    assert alerts[0].reason == "temperature_spike"
    assert alerts[0].resolved is False


def test_devices_do_not_affect_each_others_baseline(db):
    for i in range(4):
        t = NOW + timedelta(seconds=3 * i)
        handle_message(db, "warm-room", {"temperature_c": 27.0}, received_at=t)
        handle_message(db, "cold-room", {"temperature_c": 4.0}, received_at=t)

    later = NOW + timedelta(seconds=30)
    assert handle_message(db, "cold-room", {"temperature_c": 4.3}, received_at=later).is_anomaly is False
    assert handle_message(db, "warm-room", {"temperature_c": 27.4}, received_at=later).is_anomaly is False
