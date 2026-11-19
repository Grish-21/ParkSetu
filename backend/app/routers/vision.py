from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import Lot, Slot
from app.models import Booking
from app.schemas import VisionUpdate
from app.services.timeutils import as_utc
from app.services.ws_manager import ws_manager

router = APIRouter(prefix="/vision", tags=["vision"])


@router.post("/slot-status")
async def update_slot_status(payload: VisionUpdate, x_edge_key: str | None = Header(default=None),
                            db: Session = Depends(get_db)):
    if x_edge_key != settings.edge_api_key:
        raise HTTPException(status_code=401, detail="Invalid edge API key")
    lot = db.get(Lot, payload.lot_id)
    if lot is None:
        raise HTTPException(status_code=404, detail="Lot not found")
    ids = {entry.slot_id for entry in payload.slots}
    if ids:
        found = db.scalars(select(Slot).where(Slot.lot_id == lot.id, Slot.id.in_(ids))).all()
        if len(found) != len(ids):
            raise HTTPException(status_code=422, detail="One or more slots do not belong to this lot")
    by_id = {entry.slot_id: entry for entry in payload.slots}
    updated_slots = db.scalars(select(Slot).where(Slot.lot_id == lot.id, Slot.id.in_(ids))).all() if ids else []
    for slot in updated_slots:
        slot.status = "occupied" if by_id[slot.id].occupied else "free"
        slot.updated_at = as_utc(payload.ts)
        if slot.status == "occupied":
            now = as_utc(payload.ts)
            for booking in db.scalars(select(Booking).where(
                Booking.slot_id == slot.id, Booking.status == "CHECKED_IN", Booking.end_time < now,
            )).all():
                booking.status = "OVERSTAY"
                booking.overstay_minutes = max(0, int((now - as_utc(booking.end_time)).total_seconds() // 60))
                ws_manager.schedule_user(booking.user_id, {
                    "type": "booking_event", "booking_id": booking.id,
                    "event": "overstay", "message": "Your parking time has ended and the slot is still occupied.",
                    "data": {"overstay_minutes": booking.overstay_minutes},
                })
    db.commit()
    all_slots = db.scalars(select(Slot).where(Slot.lot_id == lot.id).order_by(Slot.label)).all()
    slot_data = [{"slot_id": slot.id, "label": slot.label, "status": slot.status} for slot in all_slots]
    free_count = sum(not slot.is_buffer and slot.status == "free" for slot in all_slots)
    await ws_manager.broadcast(lot.id, {
        "type": "slot_update", "lot_id": lot.id, "free_count": free_count, "slots": slot_data,
    })
    return {"ok": True}
