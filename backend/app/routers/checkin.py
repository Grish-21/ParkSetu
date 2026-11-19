from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Booking, Lot, Slot
from app.routers.bookings import booking_out
from app.schemas import CheckinIn
from app.services.timeutils import utc_now
from app.services.ws_manager import ws_manager

router = APIRouter(tags=["check-in"])


@router.post("/checkin")
def checkin(payload: CheckinIn, db: Session = Depends(get_db)):
    booking = db.scalar(select(Booking).where(Booking.qr_token == payload.qr_token))
    if booking is None:
        raise HTTPException(status_code=404, detail="QR token not found")
    if booking.status != "BOOKED":
        raise HTTPException(status_code=409, detail=f"Booking is {booking.status} and cannot be checked in")
    booking.status = "CHECKED_IN"
    booking.checked_in_at = utc_now()
    db.commit()
    db.refresh(booking)
    return booking_out(db, booking)
