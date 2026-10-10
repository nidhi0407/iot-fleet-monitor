"""
main.py

  GET  /devices                  -> current status of every device
  GET  /devices/{id}/readings    -> reading history for one device (for charts)
  GET  /alerts                   -> recent anomaly alerts
  POST /alerts/{id}/resolve      -> mark an alert as handled

On startup the app also starts the MQTT listener (which stores incoming
readings) and a background task that alerts when a device goes silent.
"""

import asyncio
import os
import secrets
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session

from auth import get_current_user
from auth_routes import router as auth_router
from database import Base, SessionLocal, engine, get_db
from models import Alert, Device, Reading
from mqtt_listener import start_mqtt_listener, stop_mqtt_listener
from offline import OFFLINE_CHECK_INTERVAL_SECONDS, check_offline_devices, is_online
from timeutil import iso_utc, utc_now

load_dotenv()

# Comma-separated list of sites allowed to call this API from a browser.
FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]


async def offline_watcher():
    """Background task: every few seconds, alert on devices that have gone silent."""
    while True:
        await asyncio.sleep(OFFLINE_CHECK_INTERVAL_SECONDS)
        db = SessionLocal()
        try:
            check_offline_devices(db, utc_now())
        except Exception as err:  # noqa: BLE001 - log and keep checking
            db.rollback()
            print(f"Offline check error: {err}")
        finally:
            db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    # Readings arrive only through MQTT: from the simulator or a real device.
    mqtt_client = start_mqtt_listener()
    watcher = asyncio.create_task(offline_watcher())
    yield
    watcher.cancel()
    stop_mqtt_listener(mqtt_client)


app = FastAPI(
    title="IoT Fleet Monitor",
    lifespan=lifespan
)

app.include_router(auth_router)

# The session cookie is only used during the Google sign-in redirect, so a
# random key per start is safe when SESSION_SECRET_KEY is not set.
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY") or secrets.token_hex(32),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/devices")
def list_devices(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    devices = db.query(Device).order_by(Device.id).all()
    now = utc_now()
    result = []

    for d in devices:
        latest = (
            db.query(Reading)
            .filter(Reading.device_id == d.id)
            .order_by(Reading.timestamp.desc())
            .first()
        )

        result.append(
            {
                "id": d.id,
                "location": d.location,
                "online": is_online(d.last_seen, now),
                "last_seen": iso_utc(d.last_seen),
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
                "timestamp": iso_utc(r.timestamp) or "",
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
                "created_at": iso_utc(a.created_at) or "",
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
