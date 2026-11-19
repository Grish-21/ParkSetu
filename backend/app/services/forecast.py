from datetime import datetime
from pathlib import Path
import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Booking, Slot
from app.services.allocation import free_now_count
from app.services.timeutils import as_utc, utc_now


def forecast_lot(db: Session, lot_id: int) -> dict:
    now = utc_now()
    slots = db.scalars(select(Slot).where(Slot.lot_id == lot_id, Slot.is_buffer.is_(False))).all()
    free_now = free_now_count(db, lot_id)
    active = db.execute(
        select(Booking.end_time, Booking.status)
        .join(Slot, Booking.slot_id == Slot.id)
        .where(Booking.lot_id == lot_id, Slot.status == "occupied",
               Booking.status.in_(("CHECKED_IN", "OVERSTAY")))
    ).all()
    booking_data = [{"end_time": as_utc(end_time), "status": status} for end_time, status in active]
    try:
        project_root = str(Path(__file__).resolve().parents[3])
        if project_root not in sys.path:
            sys.path.insert(0, project_root)
        from ml.forecast.forecast import predict_next_free
        prediction = predict_next_free(lot_id, now, booking_data, None)
    except Exception:
        future = [item["end_time"] for item in booking_data if item["end_time"]]
        prediction = {
            "next_free_at": min(future) if future else None,
            "confidence": 0.3 if future else 0.0,
            "method": "earliest_active_booking_fallback" if future else "no_active_bookings",
        }
    next_free = prediction.get("next_free_at")
    if next_free is not None and not isinstance(next_free, datetime):
        next_free = datetime.fromisoformat(str(next_free).replace("Z", "+00:00"))
    return {
        "free_now": free_now,
        "next_free_at": as_utc(next_free).isoformat().replace("+00:00", "Z") if next_free else None,
        "confidence": max(0.0, min(1.0, float(prediction.get("confidence", 0.0)))),
        "method": str(prediction.get("method", "fallback")),
    }
