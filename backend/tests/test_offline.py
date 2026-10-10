from datetime import datetime, timedelta

from models import Alert, Device
from offline import OFFLINE_THRESHOLD_SECONDS, check_offline_devices, is_online

NOW = datetime(2026, 10, 10, 12, 0, 0)
LONG_AGO = NOW - timedelta(seconds=OFFLINE_THRESHOLD_SECONDS + 60)


def add_device(db, device_id, last_seen):
    db.add(Device(id=device_id, location="test", last_seen=last_seen))
    db.commit()


def test_is_online():
    assert is_online(NOW - timedelta(seconds=1), NOW) is True
    assert is_online(LONG_AGO, NOW) is False
    assert is_online(None, NOW) is False


def test_recently_seen_device_gets_no_alert(db):
    add_device(db, "fridge-01", NOW - timedelta(seconds=2))

    assert check_offline_devices(db, NOW) == []
    assert db.query(Alert).count() == 0


def test_silent_device_gets_one_offline_alert(db):
    add_device(db, "fridge-01", LONG_AGO)

    created = check_offline_devices(db, NOW)

    assert len(created) == 1
    assert created[0].device_id == "fridge-01"
    assert created[0].reason == "device_offline"


def test_repeated_checks_do_not_repeat_the_alert(db):
    add_device(db, "fridge-01", LONG_AGO)

    check_offline_devices(db, NOW)
    check_offline_devices(db, NOW + timedelta(seconds=10))
    check_offline_devices(db, NOW + timedelta(seconds=20))

    assert db.query(Alert).count() == 1


def test_resolving_the_alert_does_not_raise_it_again_during_the_same_outage(db):
    add_device(db, "fridge-01", LONG_AGO)
    check_offline_devices(db, NOW)

    db.query(Alert).one().resolved = True
    db.commit()
    check_offline_devices(db, NOW + timedelta(seconds=10))

    assert db.query(Alert).count() == 1


def test_a_second_outage_raises_a_second_alert(db):
    add_device(db, "fridge-01", LONG_AGO)
    check_offline_devices(db, NOW)

    # The device comes back, then goes silent again.
    came_back = NOW + timedelta(minutes=5)
    db.get(Device, "fridge-01").last_seen = came_back
    db.commit()
    assert check_offline_devices(db, came_back + timedelta(seconds=1)) == []

    later = came_back + timedelta(seconds=OFFLINE_THRESHOLD_SECONDS + 60)
    assert len(check_offline_devices(db, later)) == 1
    assert db.query(Alert).count() == 2
