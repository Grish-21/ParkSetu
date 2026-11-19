from datetime import timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal
from app.models import Booking, Lot, OccupancyLog, Slot
from app.services.reroute import nearby_alternatives
from app.services.timeutils import as_utc, utc_now
from app.services.ws_manager import ws_manager

_scheduler: BackgroundScheduler | None = None
_reminded: set[int] = set()


def run_jobs(db: Session | None = None):
    owns_session = db is None
    db = db or SessionLocal()
    now = utc_now()
    try:
        # No-show release.
        cutoff = now - timedelta(minutes=settings.grace_minutes)
        late_bookings = db.scalars(select(Booking).where(
            Booking.status == "BOOKED", Booking.start_time < cutoff
        )).all()
        for booking in late_bookings:
            booking.status = "NO_SHOW"
            ws_manager.schedule_user(booking.user_id, {
                "type": "booking_event", "booking_id": booking.id,
                "event": "no_show_released", "message": "Your booking was released because you did not arrive in time.",
                "data": {},
            })

        # End reminders are sent once per process lifetime.
        reminder_window = timedelta(minutes=settings.reminder_minutes)
        checked_in = db.scalars(select(Booking).where(Booking.status == "CHECKED_IN")).all()
        for booking in checked_in:
            remaining = as_utc(booking.end_time) - now
            if booking.id not in _reminded and timedelta(0) <= remaining <= reminder_window:
                _reminded.add(booking.id)
                mins = max(1, int((remaining.total_seconds() + 59) // 60))
                ws_manager.schedule_user(booking.user_id, {
                    "type": "booking_event", "booking_id": booking.id,
                    "event": "reminder", "message": f"Your parking ends in {mins} min. Extend?",
                    "data": {"minutes_remaining": mins},
                })

        # An overstay begins only when the vision status still reports occupied.
        active_checked_in = db.scalars(select(Booking).where(Booking.status.in_(("CHECKED_IN", "OVERSTAY")))).all()
        for booking in active_checked_in:
            slot = db.get(Slot, booking.slot_id)
            if slot and as_utc(booking.end_time) < now and slot.status == "occupied":
                was_overstay = booking.status == "OVERSTAY"
                booking.status = "OVERSTAY"
                booking.overstay_minutes = max(0, int((now - as_utc(booking.end_time)).total_seconds() // 60))
                if not was_overstay:
                    ws_manager.schedule_user(booking.user_id, {
                        "type": "booking_event", "booking_id": booking.id,
                        "event": "overstay", "message": "Your parking time has ended and the slot is still occupied.",
                        "data": {"overstay_minutes": booking.overstay_minutes},
                    })

        # Warn incoming drivers if a checked-in vehicle may block the next reservation.
        upcoming = db.scalars(select(Booking).where(
            Booking.status == "BOOKED",
            Booking.start_time >= now,
            Booking.start_time <= now + timedelta(minutes=20),
        )).all()
        for incoming in upcoming:
            predecessors = db.scalars(select(Booking).where(
                Booking.slot_id == incoming.slot_id,
                Booking.id != incoming.id,
                Booking.status.in_(("CHECKED_IN", "OVERSTAY")),
                Booking.end_time <= incoming.start_time,
            ).order_by(Booking.end_time.desc())).all()
            risky = next((prior for prior in predecessors if
                          as_utc(prior.end_time) <= now or
                          incoming.start_time - timedelta(minutes=10) <= as_utc(prior.end_time) <= incoming.start_time), None)
            if risky and not incoming.at_risk:
                incoming.at_risk = True
                lot = db.get(Lot, incoming.lot_id)
                ws_manager.schedule_user(incoming.user_id, {
                    "type": "booking_event", "booking_id": incoming.id,
                    "event": "reroute_suggested",
                    "message": "Your slot may be delayed. Consider another nearby lot.",
                    "data": {"alternatives": nearby_alternatives(db, lot, incoming.start_time, incoming.end_time)},
                })

        # One occupancy snapshot per lot per scheduler tick.
        for lot in db.scalars(select(Lot)).all():
            slots = db.scalars(select(Slot).where(Slot.lot_id == lot.id)).all()
            db.add(OccupancyLog(
                lot_id=lot.id, ts=now,
                occupied_count=sum(slot.status == "occupied" for slot in slots),
                total_count=len(slots),
            ))
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        if owns_session:
            db.close()


def start_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        return
    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(run_jobs, "interval", seconds=settings.scheduler_tick_seconds,
                       id="parksetu-jobs", max_instances=1, coalesce=True)
    _scheduler.start()


def stop_scheduler():
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
