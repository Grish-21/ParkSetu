"""Tiny mock backend implementing POST /vision/slot-status for ML integration testing.

Run:  python -m tools.mock_backend          (port 8001)
      python -m tools.mock_backend --port 8001

Accepts:
  POST /vision/slot-status  with header X-Edge-Key: <EDGE_API_KEY>
Body contract (0.5):
  {"lot_id": 1, "ts": "2026-11-19T10:00:05Z", "slots": [{"slot_id": 5, "occupied": true, "confidence": 0.91}]}
Prints a readable table of slot states. Never stores frames.
"""
from __future__ import annotations

import argparse
import sys
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import uvicorn

EDGE_KEY = "dev-edge-key"

app = FastAPI(title="ParkSetu Mock Vision Backend")
# lot_id -> slot_id -> last status
STATE: dict[int, dict[int, dict]] = defaultdict(dict)
UPDATES: list[dict] = []


@app.get("/")
def root():
    return {"ok": True, "service": "mock vision backend", "endpoints": ["/vision/slot-status"]}


@app.get("/state")
def state():
    return {"lots": {str(k): dict(v) for k, v in STATE.items()}, "updates": UPDATES[-50:]}


class SlotStatus(BaseModel):
    lot_id: int
    ts: str
    slots: list[dict[str, Any]]


@app.post("/vision/slot-status")
def slot_status(body: SlotStatus, x_edge_key: str | None = Header(default=None)):
    if x_edge_key != EDGE_KEY:
        raise HTTPException(status_code=401, detail="invalid X-Edge-Key")

    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    entry = {
        "lot_id": body.lot_id,
        "ts": body.ts,
        "received_at": now,
        "slots": body.slots,
    }
    UPDATES.append(entry)
    STATE.setdefault(body.lot_id, {})

    lines = [f"[{now}] lot_id={body.lot_id} ts={body.ts}"]
    for s in body.slots:
        sid = s.get("slot_id")
        occupied = bool(s.get("occupied"))
        conf = s.get("confidence")
        STATE[body.lot_id][sid] = {"occupied": occupied, "confidence": conf, "ts": body.ts}
        lines.append(f"  slot {sid}: {'OCCUPIED' if occupied else 'free       '} conf={conf}")
    print("\n".join(lines), flush=True)
    return {"ok": True}


def main() -> None:
    parser = argparse.ArgumentParser(description="ParkSetu mock vision backend")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8001)
    args = parser.parse_args()
    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
