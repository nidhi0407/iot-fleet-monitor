from anomaly import is_temperature_anomaly


def test_not_enough_history_is_never_an_anomaly():
    assert is_temperature_anomaly([], 90.0) is False
    assert is_temperature_anomaly([4.0, 4.1], 90.0) is False


def test_normal_drift_is_not_flagged():
    assert is_temperature_anomaly([4.0, 4.2, 3.9, 4.1], 4.6) is False


def test_spike_is_flagged():
    assert is_temperature_anomaly([4.0, 4.2, 3.9, 4.1], 15.0) is True


def test_sudden_drop_is_flagged_too():
    assert is_temperature_anomaly([27.0, 27.3, 26.8], 10.0) is True


def test_each_device_is_judged_against_its_own_normal():
    # 4°C is normal for a cold room and alarming for a warm warehouse.
    assert is_temperature_anomaly([4.0, 4.1, 3.9], 4.2) is False
    assert is_temperature_anomaly([27.0, 27.1, 26.9], 4.2) is True
