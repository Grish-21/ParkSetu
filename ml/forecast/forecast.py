"""ParkSetu forecast module.

Implements predict_next_free(lot_id, now, active_bookings, walkin_avg_minutes)
exactly as in contract section 0.7. Backend imports this (wrapped in try/except).

Baseline: earliest booking end_time among occupied slots (method="earliest_end_time").
Improved (when model.pkl exists): for occupied slots without a known booking, estimate
walk-in dwell from the trained model (hour, weekday, lot type) and combine.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import pickle
from pathlib import Path

MODEL_PATH = Path(__file__).resolve().parent / "model.pkl"


def _to_datetime(v) -> datetime | None:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v
    try:
        return datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except ValueError:
        return None


def _load_model():
    """Return (model, encoder, lot_types) or None if model.pkl is missing/invalid."""
    if not MODEL_PATH.exists():
        return None
    try:
        with open(MODEL_PATH, "rb") as f:
            data = pickle.load(f)
        return data.get("model"), data.get("encoder"), data.get("lot_types", [])
    except Exception:
        return None


def _predict_dwell(model_pack, lot_id: int, now: datetime) -> float | None:
    """Predict stay minutes for a walk-in using the trained model."""
    if model_pack is None:
        return None
    model, encoder, lot_types = model_pack
    try:
        import numpy as np

        hour = now.hour
        weekday = now.weekday()
        # lot type: derive a stable index from lot_id (demo simplification)
        lt_index = (lot_id - 1) % len(lot_types) if lot_types else 0
        lot_type = lot_types[lt_index] if lot_types else "mall"
        lot_enc = encoder.transform(np.array([[lot_type]]))
        X = np.hstack([[float(hour), float(weekday)], lot_enc[0]]).reshape(1, -1)
        pred = float(model.predict(X)[0])
        return max(5.0, pred)
    except Exception:
        return None


def predict_next_free(
    lot_id: int,
    now: datetime,
    active_bookings: list[dict],
    walkin_avg_minutes: float | None,
) -> dict:
    """active_bookings: [{"end_time": datetime, "status": str}] for occupied slots.

    Returns {"next_free_at": datetime | None, "confidence": float, "method": str}
    """
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    if not active_bookings:
        return {"next_free_at": None, "confidence": 0.0, "method": "no_occupancy"}

    model_pack = _load_model()

    candidates: list[tuple[datetime, float, str]] = []
    for b in active_bookings:
        end_time = _to_datetime(b.get("end_time"))
        if end_time is not None:
            if end_time.tzinfo is None:
                end_time = end_time.replace(tzinfo=timezone.utc)
            # known booking: high confidence
            candidates.append((end_time, 0.9, "earliest_end_time"))
        else:
            # walk-in occupied slot without a booked end time
            dwell = _predict_dwell(model_pack, lot_id, now)
            if dwell is not None:
                candidates.append((now + timedelta(minutes=dwell), 0.6, "dwell_model"))
            elif walkin_avg_minutes is not None:
                candidates.append(
                    (now + timedelta(minutes=float(walkin_avg_minutes)), 0.5, "walkin_avg")
                )

    if not candidates:
        return {"next_free_at": None, "confidence": 0.0, "method": "no_data"}

    # soonest free slot wins
    next_free_at, confidence, method = min(candidates, key=lambda c: c[0])
    return {
        "next_free_at": next_free_at,
        "confidence": round(confidence, 2),
        "method": method,
    }


__all__ = ["predict_next_free"]
