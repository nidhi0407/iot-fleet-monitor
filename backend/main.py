"""
main.py

FastAPI app -- same tool you used for Skylark Weather and the Stock
Research Agent. Exposes the data the dashboard needs:

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

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from anomaly import seconds_since
from database import Base, SessionLocal, engine, get_db
from models import Alert, Device, Reading
from mqtt_listener import start_mqtt_listener

OFFLINE_THRESHOLD_SECONDS = 20  # matches ~3s publish interval with headroom


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    start_mqtt_listener()
    yield


app = FastAPI(title="IoT Fleet Monitor", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/devices")
def list_devices(db: Session = Depends(get_db)):
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
        last_seen = d.last_seen.replace(tzinfo=timezone.utc) if d.last_seen else None
        is_online = last_seen is not None and seconds_since(last_seen, now) < OFFLINE_THRESHOLD_SECONDS

        result.append({
            "id": d.id,
            "location": d.location,
            "online": is_online,
            "last_seen": d.last_seen,
            "latest_temperature_c": latest.temperature_c if latest else None,
            "latest_battery_pct": latest.battery_pct if latest else None,
            "latest_is_anomaly": latest.is_anomaly if latest else False,
        })

    return result


@app.get("/devices/{device_id}/readings")
def device_readings(device_id: str, limit: int = 50, db: Session = Depends(get_db)):
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
    return list(reversed(readings))  # oldest -> newest, easier to chart


@app.get("/alerts")
def list_alerts(resolved: Optional[bool] = None, db: Session = Depends(get_db)):
    query = db.query(Alert)
    if resolved is not None:
        query = query.filter(Alert.resolved == resolved)
    return query.order_by(Alert.created_at.desc()).limit(100).all()


@app.post("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.get(Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.resolved = True
    db.commit()
    return {"status": "resolved", "alert_id": alert_id}
