"""
main.py

  GET  /devices                  -> current status of every device
  GET  /devices/{id}/readings    -> reading history for one device (for charts)
  GET  /alerts                   -> recent anomaly alerts
  POST /alerts/{id}/resolve      -> mark an alert as handled

Spins up a background live telemetry generator loop so devices update in real-time
(online status, moving temperature charts, live anomaly alerts).
"""

import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import random
import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session

from anomaly import seconds_since
from database import Base, SessionLocal, engine, get_db
from models import Alert, Device, Reading, User
from auth_routes import router as auth_router
from auth import get_current_user

load_dotenv()

OFFLINE_THRESHOLD_SECONDS = 25

SIMULATED_DEVICES = [
    {"id": "device-01", "location": "Warehouse A - Shelf 1", "base_temp": 23.5},
    {"id": "device-02", "location": "Warehouse A - Shelf 2", "base_temp": 24.8},
    {"id": "device-03", "location": "Warehouse B - Dock", "base_temp": 27.2},
    {"id": "device-04", "location": "Warehouse B - Cold Storage", "base_temp": 4.5},
    {"id": "device-05", "location": "Warehouse C - Loading Bay", "base_temp": 26.1},
]


async def background_telemetry_generator():
    """Background task generating live sensor telemetry every 3 seconds."""
    while True:
        try:
            db = SessionLocal()
            now = datetime.now(timezone.utc)

            for item in SIMULATED_DEVICES:
                device_id = item["id"]
                base_temp = item["base_temp"]

                # Upsert device
                device = db.get(Device, device_id)
                if device is None:
                    device = Device(id=device_id, location=item["location"])
                    db.add(device)

                # Update last seen timestamp
                device.last_seen = now

                # Generate realistic temp reading
                temp = base_temp + random.uniform(-0.8, 0.8)

                # Faulty device-03 occasional spike
                is_anomaly_triggered = False
                if device_id == "device-03" and random.random() < 0.12:
                    temp += random.uniform(12.0, 25.0)
                    is_anomaly_triggered = True

                temp_rounded = round(temp, 1)

                reading = Reading(
                    device_id=device_id,
                    temperature_c=temp_rounded,
                    battery_pct=round(random.uniform(70.0, 99.0), 1),
                    timestamp=now,
                    is_anomaly=is_anomaly_triggered,
                )
                db.add(reading)

                if is_anomaly_triggered:
                    db.add(
                        Alert(
                            device_id=device_id,
                            reason="temperature_spike",
                            created_at=now,
                            resolved=False,
                        )
                    )

            db.commit()
            db.close()
        except Exception as err:
            print(f"Telemetry generator error: {err}")

        await asyncio.sleep(3)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    # Start live telemetry simulation task
    task = asyncio.create_task(background_telemetry_generator())
    yield
    task.cancel()


app = FastAPI(
    title="IoT Fleet Monitor",
    lifespan=lifespan
)

app.include_router(auth_router)

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY", "fallback-secret-key-12345")
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/devices")
def list_devices(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    devices = db.query(Device).all()
    now = datetime.now(timezone.utc)
    result = []

    for d in devices:
        latest = (
            db.query(Reading)
            .filter(Reading.device_id == d.id)
            .order_by(Reading.timestamp.desc())
            .first()
        )

        last_seen = (
            d.last_seen.replace(tzinfo=timezone.utc)
            if d.last_seen and d.last_seen.tzinfo is None
            else d.last_seen
        )

        is_online = (
            last_seen is not None
            and seconds_since(last_seen, now) < OFFLINE_THRESHOLD_SECONDS
        )

        result.append(
            {
                "id": d.id,
                "location": d.location,
                "online": is_online,
                "last_seen": d.last_seen.isoformat() if d.last_seen else None,
                "latest_temperature_c": latest.temperature_c if latest else None,
                "latest_battery_pct": latest.battery_pct if latest else None,
                "latest_is_anomaly": latest.is_anomaly if latest else False,
            }
        )

    return result


@app.get("/devices/{device_id}/readings")
def device_readings(
    device_id: str,
    limit: int = 50,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    device = db.get(Device, device_id)

    if device is None:
        raise HTTPException(status_code=404, detail="Device not found")

    readings = (
        db.query(Reading)
        .filter(Reading.device_id == device_id)
        .order_by(Reading.timestamp.desc())
        .limit(limit)
        .all()
    )

    result = []
    for r in reversed(readings):
        result.append(
            {
                "id": r.id,
                "device_id": r.device_id,
                "temperature_c": r.temperature_c,
                "battery_pct": r.battery_pct,
                "timestamp": r.timestamp.isoformat() if r.timestamp else "",
                "is_anomaly": r.is_anomaly,
            }
        )

    return result


@app.get("/alerts")
def list_alerts(
    resolved: Optional[bool] = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Alert)

    if resolved is not None:
        query = query.filter(Alert.resolved == resolved)

    alerts = query.order_by(Alert.created_at.desc()).limit(100).all()
    result = []
    for a in alerts:
        result.append(
            {
                "id": a.id,
                "device_id": a.device_id,
                "reason": a.reason,
                "created_at": a.created_at.isoformat() if a.created_at else "",
                "resolved": a.resolved,
            }
        )

    return result


@app.post("/alerts/{alert_id}/resolve")
def resolve_alert(
    alert_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = db.get(Alert, alert_id)

    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.resolved = True
    db.commit()

    return {
        "status": "resolved",
        "alert_id": alert_id,
    }