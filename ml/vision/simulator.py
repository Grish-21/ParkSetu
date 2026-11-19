"""ParkSetu vision simulator - fake camera source that posts slot statuses.

Needs no camera or YOLO model. Unblocks backend/frontend integration in the
first hour. Posts the same body as the edge service (contract 0.5).

Run (with mock backend in another terminal):
  python -m tools.mock_backend
  python -m vision.simulator --lot-id 1 --slots 1,2,3,4,5 --interval 4
  python -m vision.simulator --lot-id 1 --slots 1,2,3,4,5 --scenario overstay --overstay-slot 3

CLI flags: --lot-id, --slots, --interval, --scenario normal|overstay, --url, --key
"""
from __future__ import annotations

import argparse
import json
import random
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from vision.config import (  # noqa: E402
    EDGE_KEY,
    LOT_ID,
    MOCK_BACKEND_URL,
    SIMULATOR_INTERVAL,
    SIMULATOR_SCENARIO,
    SIMULATOR_SLOTS,
    SIMULATOR_OVERSTAY_SLOT,
)

VEHICLE_CLASSES = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class SlotSim:
    """Per-slot realistic occupancy: random arrivals and dwell times."""

    def __init__(self, slot_id: int, rng: random.Random, scenario: str, overstay: bool):
        self.slot_id = slot_id
        self.rng = rng
        self.scenario = scenario
        self.overstay = overstay
        self.occupied = False
        self.timer = 0  # intervals remaining in current state
        self.confidence = 0.0
        self._reset()

    def _reset(self) -> None:
        if self.overstay and self.scenario == "overstay":
            self.occupied = True
            self.timer = 10 ** 9  # effectively indefinite
            self.confidence = 0.95
            return
        if self.occupied:
            # dwell: short stay (~25%) or long stay (~75%), in intervals
            if self.rng.random() < 0.25:
                self.timer = self.rng.randint(3, 8)  # short
            else:
                self.timer = self.rng.randint(12, 30)  # long
            self.confidence = round(self.rng.uniform(0.85, 0.99), 2)
        else:
            # time until next arrival
            self.timer = self.rng.randint(2, 10)
            self.confidence = round(self.rng.uniform(0.80, 0.95), 2)

    def tick(self) -> bool:
        """Advance one interval. Returns True if status changed."""
        before = self.occupied
        if self.timer > 0:
            self.timer -= 1
        if self.timer <= 0:
            self.occupied = not self.occupied
            self._reset()
        return self.occupied != before

    def status(self) -> dict:
        return {
            "slot_id": self.slot_id,
            "occupied": self.occupied,
            "confidence": self.confidence,
        }


def parse_slots(slots_arg: str) -> list[int]:
    out = []
    for part in slots_arg.split(","):
        part = part.strip()
        if part:
            out.append(int(part))
    return out


def post(url: str, key: str, lot_id: int, slots: list[dict]) -> None:
    body = {"lot_id": lot_id, "ts": now_iso(), "slots": slots}
    try:
        r = requests.post(f"{url}/vision/slot-status", json=body, headers={"X-Edge-Key": key}, timeout=5)
        r.raise_for_status()
    except requests.RequestException as exc:
        print(f"[simulator] POST failed (backend down?): {exc}", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="ParkSetu vision simulator")
    parser.add_argument("--lot-id", type=int, default=LOT_ID)
    parser.add_argument("--slots", default=SIMULATOR_SLOTS, help="comma-separated slot ids")
    parser.add_argument("--interval", type=float, default=SIMULATOR_INTERVAL)
    parser.add_argument("--scenario", choices=["normal", "overstay"], default=SIMULATOR_SCENARIO)
    parser.add_argument(
        "--overstay-slot", type=int, default=SIMULATOR_OVERSTAY_SLOT,
        help="slot that stays occupied forever in overstay scenario",
    )
    parser.add_argument("--url", default=MOCK_BACKEND_URL, help="backend base URL (use mock: http://localhost:8001)")
    parser.add_argument("--key", default=EDGE_KEY, help="X-Edge-Key value")
    args = parser.parse_args()

    slot_ids = parse_slots(args.slots)
    if not slot_ids:
        raise SystemExit("--slots must contain at least one slot id")
    overstay_slot = args.overstay_slot or (slot_ids[0] if args.scenario == "overstay" else None)

    rng = random.Random(42)
    sims = {
        sid: SlotSim(sid, rng, args.scenario, overstay=(sid == overstay_slot)) for sid in slot_ids
    }

    print(f"[simulator] lot={args.lot_id} slots={slot_ids} scenario={args.scenario} url={args.url}", flush=True)
    if overstay_slot:
        print(f"[simulator] overstay slot: {overstay_slot} (stays occupied)", flush=True)

    while True:
        changed = []
        for sid in slot_ids:
            if sims[sid].tick():
                changed.append(sims[sid].status())
        # always send at least one status update per interval so the demo is visible
        payload = [sims[sid].status() for sid in slot_ids] if changed else [sims[slot_ids[0]].status()]
        post(args.url, args.key, args.lot_id, payload)
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
