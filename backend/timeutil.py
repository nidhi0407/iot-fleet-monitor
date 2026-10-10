"""
timeutil.py

Every timestamp in the database is stored as UTC with no timezone attached
("naive UTC"). These helpers keep that rule in one place so readings from a
device, the server clock and the API all agree.
"""

from datetime import datetime, timezone
from typing import Optional


def utc_now() -> datetime:
    """Current time as naive UTC, ready to store."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_naive_utc(value: datetime) -> datetime:
    """Convert any datetime to naive UTC. Naive input is assumed to be UTC."""
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def parse_device_timestamp(raw) -> Optional[datetime]:
    """
    Parse a timestamp sent by a device. Returns None if it is missing or
    unreadable, so the caller can fall back to the server clock. A real
    board has no clock until it syncs one, so this is a normal case.
    """
    if not isinstance(raw, str) or not raw:
        return None
    try:
        return to_naive_utc(datetime.fromisoformat(raw.replace("Z", "+00:00")))
    except ValueError:
        return None


def iso_utc(value: Optional[datetime]) -> Optional[str]:
    """Format a stored timestamp for the API, marked as UTC so browsers convert it correctly."""
    if value is None:
        return None
    return to_naive_utc(value).replace(tzinfo=timezone.utc).isoformat()
