import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import require_roles
from app.db import get_db
from app.models import Lot, Slot, User
from app.schemas import LotCreate, SlotCreate
from app.services.allocation import free_count_for_window, free_now_count
from app.services.forecast import forecast_lot
from app.services.geo import haversine_km
from app.services.timeutils import as_utc, utc_now

router = APIRouter(prefix="/lots", tags=["lots"])


def _lot_detail(db: Session, lot: Lot) -> dict:
    slots = db.scalars(select(Slot).where(Slot.lot_id == lot.id)).all()
    return {
        "id": lot.id, "name": lot.name, "address": lot.address,
        "lat": lot.lat, "lng": lot.lng, "price_per_hour": lot.price_per_hour,
        "total_slots": sum(not slot.is_buffer for slot in slots),
        "free_now": free_now_count(db, lot.id),
    }


@router.get("/nearby")
def nearby(lat: float, lng: float, radius_km: float = Query(5, gt=0, le=100),
           start: datetime | None = None, end: datetime | None = None,
           db: Session = Depends(get_db)):
    has_window = start is not None and end is not None
    if (start is None) != (end is None):
        raise HTTPException(status_code=422, detail="start and end must be provided together")
    if start is not None and end is not None:
        start, end = as_utc(start), as_utc(end)
        if end <= start:
            raise HTTPException(status_code=422, detail="end must be after start")
    else:
        now = utc_now()
        start, end = now, now + timedelta(seconds=1)

    rows = []
    for lot in db.scalars(select(Lot)).all():
        distance = haversine_km(lat, lng, lot.lat, lot.lng)
        if distance > radius_km:
            continue
        slots = db.scalars(select(Slot).where(Slot.lot_id == lot.id, Slot.is_buffer.is_(False))).all()
        now_count = free_now_count(db, lot.id)
        rows.append({
            "id": lot.id, "name": lot.name, "address": lot.address,
            "lat": lot.lat, "lng": lot.lng, "distance_km": round(distance, 2),
            "price_per_hour": lot.price_per_hour, "total_slots": len(slots),
            "free_now": now_count,
            "free_for_window": free_count_for_window(db, lot.id, start, end) if has_window else now_count,
        })
    return sorted(rows, key=lambda item: item["distance_km"])


@router.get("/{lot_id}")
def get_lot(lot_id: int, db: Session = Depends(get_db)):
    lot = db.get(Lot, lot_id)
    if lot is None:
        raise HTTPException(status_code=404, detail="Lot not found")
    return _lot_detail(db, lot)


@router.get("/{lot_id}/slots")
def get_slots(lot_id: int, db: Session = Depends(get_db)):
    if db.get(Lot, lot_id) is None:
        raise HTTPException(status_code=404, detail="Lot not found")
    slots = db.scalars(select(Slot).where(Slot.lot_id == lot_id).order_by(Slot.label)).all()
    return [{
        "id": slot.id, "label": slot.label, "status": slot.status,
        "is_buffer": slot.is_buffer,
        "polygon": json.loads(slot.polygon) if slot.polygon else None,
    } for slot in slots]


@router.post("", status_code=201)
def create_lot(payload: LotCreate, db: Session = Depends(get_db),
               user: User = Depends(require_roles("owner", "admin"))):
    lot = Lot(owner_id=user.id if user.role == "owner" else None, **payload.model_dump())
    db.add(lot)
    db.commit()
    db.refresh(lot)
    return _lot_detail(db, lot)


@router.post("/{lot_id}/slots", status_code=201)
def create_slots(lot_id: int, payload: list[SlotCreate], db: Session = Depends(get_db),
                 user: User = Depends(require_roles("owner", "admin"))):
    lot = db.get(Lot, lot_id)
    if lot is None:
        raise HTTPException(status_code=404, detail="Lot not found")
    if user.role == "owner" and lot.owner_id != user.id:
        raise HTTPException(status_code=403, detail="You do not own this lot")
    existing = set(db.scalars(select(Slot.label).where(Slot.lot_id == lot_id)).all())
    labels = [item.label for item in payload]
    if len(set(labels)) != len(labels) or existing.intersection(labels):
        raise HTTPException(status_code=409, detail="Slot labels must be unique within a lot")
    slots = [Slot(lot_id=lot_id, label=item.label, polygon=json.dumps(item.polygon) if item.polygon is not None else None,
                  is_buffer=item.is_buffer, status="free", updated_at=datetime.now(timezone.utc)) for item in payload]
    db.add_all(slots)
    db.commit()
    for slot in slots:
        db.refresh(slot)
    return [{"id": slot.id, "label": slot.label, "status": slot.status,
             "is_buffer": slot.is_buffer, "polygon": json.loads(slot.polygon) if slot.polygon else None}
            for slot in slots]


@router.get("/{lot_id}/forecast")
def get_forecast(lot_id: int, db: Session = Depends(get_db)):
    if db.get(Lot, lot_id) is None:
        raise HTTPException(status_code=404, detail="Lot not found")
    return forecast_lot(db, lot_id)
