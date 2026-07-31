"""
main.py

  GET  /devices                  -> current status of every device
  GET  /devices/{id}/readings    -> reading history for one device (for charts)
  GET  /alerts                   -> recent anomaly alerts
  POST /alerts/{id}/resolve      -> mark an alert as handled

On startup, it also spins up the MQTT listener in the background so the
whole pipeline (simulator -> MQTT -> backend -> dashboard) runs from one
`uvicorn main:app` command.
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional
import os

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String

from anomaly import seconds_since
from database import Base, SessionLocal, engine, get_db
from models import Alert, Device, Reading,User
from mqtt_listener import start_mqtt_listener
from auth_routes import router as auth_router
from auth import get_current_user


load_dotenv()





OFFLINE_THRESHOLD_SECONDS = 20


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    # Uncomment this after OAuth is working
    # start_mqtt_listener()

    yield


app = FastAPI(
    title="IoT Fleet Monitor",
    lifespan=lifespan
)

app.include_router(auth_router)

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY")
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
            if d.last_seen
            else None
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
                "last_seen": d.last_seen,
                "latest_temperature_c": latest.temperature_c if latest else None,
                "latest_battery_pct": latest.battery_pct if latest else None,
                "latest_is_anomaly": latest.is_anomaly if latest else False,
            }
        )

    return result

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

    return list(reversed(readings))


def list_alerts(
    resolved: Optional[bool] = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Alert)

    if resolved is not None:
        query = query.filter(Alert.resolved == resolved)

    return query.order_by(Alert.created_at.desc()).limit(100).all()


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