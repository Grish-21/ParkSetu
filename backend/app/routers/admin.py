from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import require_roles
from app.db import get_db
from app.models import Booking, Lot, OccupancyLog, User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
def stats(lot_id: int | None = None, db: Session = Depends(get_db),
          user: User = Depends(require_roles("owner", "admin"))):
    lot_ids = None
    if lot_id is not None:
        lot = db.get(Lot, lot_id)
        if lot is None:
            raise HTTPException(status_code=404, detail="Lot not found")
        if user.role == "owner" and lot.owner_id != user.id:
            raise HTTPException(status_code=403, detail="You do not own this lot")
        lot_ids = [lot_id]
    elif user.role == "owner":
        lot_ids = db.scalars(select(Lot.id).where(Lot.owner_id == user.id)).all()

    booking_query = select(Booking)
    occupancy_query = select(OccupancyLog)
    if lot_ids is not None:
        booking_query = booking_query.where(Booking.lot_id.in_(lot_ids))
        occupancy_query = occupancy_query.where(OccupancyLog.lot_id.in_(lot_ids))
    bookings = db.scalars(booking_query).all()
    total = len(bookings)
    no_shows = sum(item.status == "NO_SHOW" for item in bookings)
    overstays = sum(item.status == "OVERSTAY" or item.overstay_minutes > 0 for item in bookings)
    revenue = round(sum(item.amount for item in bookings), 2)

    hourly = defaultdict(list)
    for row in db.scalars(occupancy_query).all():
        ts = row.ts
        hour = ts.hour
        rate = row.occupied_count / row.total_count if row.total_count else 0
        hourly[hour].append(rate)
    occupancy_by_hour = [
        {"hour": hour, "avg_occupancy": round(sum(hourly[hour]) / len(hourly[hour]), 3) if hourly[hour] else 0.0}
        for hour in range(24)
    ]
    max_occupancy = max((item["avg_occupancy"] for item in occupancy_by_hour), default=0)
    peak_hours = [item["hour"] for item in occupancy_by_hour
                  if max_occupancy > 0 and item["avg_occupancy"] == max_occupancy]
    return {
        "occupancy_by_hour": occupancy_by_hour,
        "bookings_total": total,
        "no_show_rate": round(no_shows / total, 3) if total else 0.0,
        "overstay_rate": round(overstays / total, 3) if total else 0.0,
        "revenue": revenue,
        "peak_hours": peak_hours,
    }
