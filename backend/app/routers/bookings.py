from datetime import timedelta
from math import ceil
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_roles
from app.db import get_db
from app.models import Booking, Lot, Slot, User
from app.schemas import BookingCreate, BookingOut, ExtendIn
from app.services.allocation import ACTIVE_STATUSES, allocation_lock, find_available_slot, slot_is_available
from app.services.pricing import calculate_amount
from app.services.reroute import nearby_alternatives
from app.services.timeutils import as_utc, utc_now
from app.services.ws_manager import ws_manager

router = APIRouter(prefix="/bookings", tags=["bookings"])


def booking_out(db: Session, booking: Booking) -> dict:
    lot = db.get(Lot, booking.lot_id)
    slot = db.get(Slot, booking.slot_id)
    return {
        "id": booking.id, "lot_id": booking.lot_id, "lot_name": lot.name if lot else "",
        "slot_id": booking.slot_id, "slot_label": slot.label if slot else "",
        "vehicle_no": booking.vehicle_no, "start_time": as_utc(booking.start_time),
        "end_time": as_utc(booking.end_time), "status": booking.status,
        "qr_token": booking.qr_token, "checked_in_at": as_utc(booking.checked_in_at),
        "exited_at": as_utc(booking.exited_at), "amount": booking.amount,
        "overstay_minutes": booking.overstay_minutes, "at_risk": booking.at_risk,
    }


def _booking_for_user(db: Session, booking_id: int, user: User) -> Booking:
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    if user.role != "admin" and booking.user_id != user.id:
        raise HTTPException(status_code=403, detail="This booking belongs to another user")
    return booking


@router.post("", response_model=BookingOut, status_code=201)
def create_booking(payload: BookingCreate, db: Session = Depends(get_db),
                   user: User = Depends(require_roles("driver", "admin"))):
    lot = db.get(Lot, payload.lot_id)
    if lot is None:
        raise HTTPException(status_code=404, detail="Lot not found")

    # Serializes allocation checks and inserts within this API process, and the
    # check plus insert commit together in one SQLAlchemy transaction.
    with allocation_lock:
        slot = find_available_slot(db, lot.id, payload.start_time, payload.end_time)
        if slot is None:
            alternatives = nearby_alternatives(db, lot, payload.start_time, payload.end_time)
            raise HTTPException(status_code=409, detail={
                "message": "No slot is available for the requested window",
                "alternatives": alternatives,
            })
        booking = Booking(
            user_id=user.id, lot_id=lot.id, slot_id=slot.id,
            vehicle_no=payload.vehicle_no.strip().upper(),
            start_time=payload.start_time, end_time=payload.end_time,
            status="BOOKED", qr_token=secrets.token_urlsafe(24), amount=0,
            overstay_minutes=0, at_risk=False, created_at=utc_now(),
        )
        db.add(booking)
        db.flush()

        # Reroute warnings are calculated when the booking is made if it starts soon.
        risk_event = None
        now = utc_now()
        if payload.start_time <= now + timedelta(minutes=20):
            previous = db.scalars(
                select(Booking).where(
                    Booking.slot_id == slot.id, Booking.id != booking.id,
                    Booking.status.in_(("CHECKED_IN", "OVERSTAY")),
                    Booking.end_time <= payload.start_time,
                ).order_by(Booking.end_time.desc())
            ).first()
            if previous and (as_utc(previous.end_time) <= now or
                             as_utc(previous.end_time) >= payload.start_time - timedelta(minutes=10)):
                booking.at_risk = True
                risk_event = {
                    "type": "booking_event", "booking_id": booking.id,
                    "event": "reroute_suggested",
                    "message": "Your slot may be delayed. Consider another nearby lot.",
                    "data": {"alternatives": nearby_alternatives(db, lot, payload.start_time, payload.end_time)},
                }
        db.commit()
        db.refresh(booking)
    if risk_event:
        ws_manager.schedule_user(user.id, risk_event)
    return booking_out(db, booking)


@router.get("/me", response_model=list[BookingOut])
def my_bookings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.scalars(select(Booking).where(Booking.user_id == user.id).order_by(Booking.created_at.desc())).all()
    return [booking_out(db, booking) for booking in rows]


@router.post("/{booking_id}/extend", response_model=BookingOut)
def extend_booking(booking_id: int, payload: ExtendIn, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    booking = _booking_for_user(db, booking_id, user)
    new_end = as_utc(payload.new_end_time)
    if booking.status not in ("BOOKED", "CHECKED_IN", "OVERSTAY"):
        raise HTTPException(status_code=409, detail="This booking cannot be extended")
    if new_end <= as_utc(booking.end_time):
        raise HTTPException(status_code=422, detail="new_end_time must be later than the current end_time")
    if new_end - as_utc(booking.start_time) > timedelta(hours=12):
        raise HTTPException(status_code=422, detail="bookings may not exceed 12 hours")
    slot = db.get(Slot, booking.slot_id)
    if not slot_is_available(db, slot, booking.end_time, new_end,
                             exclude_booking_id=booking.id, check_physical_occupancy=False):
        raise HTTPException(status_code=409, detail="The next booking blocks this extension")
    booking.end_time = new_end
    if booking.status == "OVERSTAY":
        booking.status = "CHECKED_IN"
        booking.overstay_minutes = 0
    lot = db.get(Lot, booking.lot_id)
    booking.amount = calculate_amount(booking.start_time, new_end, lot.price_per_hour,
                                      booking.overstay_minutes, lot.overstay_multiplier)
    db.commit()
    db.refresh(booking)
    ws_manager.schedule_user(booking.user_id, {
        "type": "booking_event", "booking_id": booking.id, "event": "extended",
        "message": "Your parking booking was extended.", "data": {"end_time": new_end.isoformat().replace("+00:00", "Z")},
    })
    return booking_out(db, booking)


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(booking_id: int, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    booking = _booking_for_user(db, booking_id, user)
    if booking.status != "BOOKED":
        raise HTTPException(status_code=409, detail="Only a BOOKED booking can be cancelled")
    booking.status = "CANCELLED"
    db.commit()
    db.refresh(booking)
    return booking_out(db, booking)


@router.post("/{booking_id}/exit", response_model=BookingOut)
def exit_booking(booking_id: int, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    booking = _booking_for_user(db, booking_id, user)
    if booking.status not in ("CHECKED_IN", "OVERSTAY"):
        raise HTTPException(status_code=409, detail="Only a checked-in booking can exit")
    now = utc_now()
    end_time = as_utc(booking.end_time)
    booking.overstay_minutes = max(0, ceil((now - end_time).total_seconds() / 60))
    lot = db.get(Lot, booking.lot_id)
    booking.amount = calculate_amount(booking.start_time, booking.end_time, lot.price_per_hour,
                                      booking.overstay_minutes, lot.overstay_multiplier)
    booking.exited_at = now
    booking.status = "COMPLETED"
    slot = db.get(Slot, booking.slot_id)
    slot.status = "free"
    slot.updated_at = now
    db.commit()
    db.refresh(booking)
    return booking_out(db, booking)


@router.get("/{booking_id}/alternatives")
def booking_alternatives(booking_id: int, db: Session = Depends(get_db),
                         user: User = Depends(get_current_user)):
    booking = _booking_for_user(db, booking_id, user)
    lot = db.get(Lot, booking.lot_id)
    return nearby_alternatives(db, lot, booking.start_time, booking.end_time)
