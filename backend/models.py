from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database import Base


class Device(Base):
    __tablename__ = "devices"

    id = Column(String, primary_key=True)  # e.g. "device-01"
    location = Column(String)
    last_seen = Column(DateTime, nullable=True)

    readings = relationship("Reading", back_populates="device")


class Reading(Base):
    __tablename__ = "readings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String, ForeignKey("devices.id"))
    temperature_c = Column(Float)
    battery_pct = Column(Float)
    timestamp = Column(DateTime)
    is_anomaly = Column(Boolean, default=False)

    device = relationship("Device", back_populates="readings")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String, ForeignKey("devices.id"))
    reason = Column(String)  # e.g. "temperature_spike" or "device_offline"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolved = Column(Boolean, default=False)
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    name = Column(String)
    picture = Column(String)