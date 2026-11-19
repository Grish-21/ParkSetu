from datetime import datetime, timedelta, timezone
from threading import Lock

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.models import Booking, Slot
from app.services.timeutils import as_utc

ACTIVE_STATUSES = ("BOOKED", "CHECKED_IN", "OVERSTAY")
allocation_lock = Lock()


def slot_is_available(db: Session, slot: Slot, start: datetime, end: datetime,
                      *, exclude_booking_id: int | None = None,
                      check_physical_occupancy: bool = True) -> bool:
    if slot.is_buffer:
        return False
    start, end = as_utc(start), as_utc(end)
    query = select(Booking.id).where(
        Booking.slot_id == slot.id,
        Booking.status.in_(ACTIVE_STATUSES),
        Booking.start_time < end,
        Booking.end_time > start,
    )
    if exclude_booking_id is not None:
        query = query.where(Booking.id != exclude_booking_id)
    if db.scalar(query.limit(1)) is not None:
        return False
    now = datetime.now(timezone.utc)
    if check_physical_occupancy and start <= now < end and slot.status == "occupied":
        return False
    return True


def find_available_slot(db: Session, lot_id: int, start: datetime, end: datetime) -> Slot | None:
    slots = db.scalars(select(Slot).where(Slot.lot_id == lot_id, Slot.is_buffer.is_(False)).order_by(Slot.label)).all()
    return next((slot for slot in slots if slot_is_available(db, slot, start, end)), None)


def free_count_for_window(db: Session, lot_id: int, start: datetime, end: datetime) -> int:
    slots = db.scalars(select(Slot).where(Slot.lot_id == lot_id, Slot.is_buffer.is_(False))).all()
    return sum(slot_is_available(db, slot, start, end) for slot in slots)


def free_now_count(db: Session, lot_id: int, now: datetime | None = None) -> int:
    now = as_utc(now or datetime.now(timezone.utc))
    # A short interval makes current reservations overlap, while the camera status
    # excludes physically occupied walk-in vehicles without a booking.
    return free_count_for_window(db, lot_id, now, now + timedelta(seconds=1))
