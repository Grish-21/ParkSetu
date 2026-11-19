from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Lot
from app.services.allocation import free_count_for_window, free_now_count
from app.services.geo import haversine_km


def nearby_alternatives(db: Session, origin: Lot, start: datetime, end: datetime,
                        radius_km: float = 10) -> list[dict]:
    candidates = []
    for lot in db.scalars(select(Lot).where(Lot.id != origin.id)).all():
        distance = haversine_km(origin.lat, origin.lng, lot.lat, lot.lng)
        free = free_count_for_window(db, lot.id, start, end)
        if distance <= radius_km and free > 0:
            candidates.append({
                "id": lot.id, "name": lot.name, "address": lot.address,
                "lat": lot.lat, "lng": lot.lng, "distance_km": round(distance, 2),
                "price_per_hour": lot.price_per_hour,
                "total_slots": sum(not slot.is_buffer for slot in lot.slots),
                "free_now": free_now_count(db, lot.id),
                "free_for_window": free,
            })
    return sorted(candidates, key=lambda item: item["distance_km"])
