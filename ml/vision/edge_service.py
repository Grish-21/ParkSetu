"""ParkSetu edge service.

Loop: read source -> detect -> POST slot status to backend.
- SOURCE: video file, webcam index, or RTSP/http URL
- Slot geometry: slots.json
- POST {BACKEND_URL}/vision/slot-status with header X-Edge-Key
- Posts only on status change + heartbeat every 30 s
- Retries with backoff when backend is down; never crashes
- Privacy: never uploads frames, only slot statuses

Run:
  python -m vision.edge_service          (uses config: SOURCE, slots.json)
  SOURCE=sample.mp4 python -m vision.edge_service
"""
from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path

import cv2
import requests

from vision.config import (  # noqa: E402
    BACKEND_URL, EDGE_KEY, HEARTBEAT_INTERVAL, INTERVAL, LOT_ID, SLOTS_FILE, SOURCE,
)
from vision.detector import SlotDetector  # noqa: E402


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_slots(path: Path = SLOTS_FILE) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def open_source(source: str | int | None):
    """Open video/webcam/RTSP. Returns cv2.VideoCapture."""
    if source is None or str(source).strip() == "":
        cap = cv2.VideoCapture(0)
    elif str(source).isdigit():
        cap = cv2.VideoCapture(int(source))
    else:
        cap = cv2.VideoCapture(str(source))
    if not cap.isOpened():
        raise RuntimeError(f"could not open source: {source}")
    return cap


def post(url: str, key: str, lot_id: int, slots: list[dict]) -> bool:
    body = {"lot_id": lot_id, "ts": now_iso(), "slots": slots}
    try:
        r = requests.post(f"{url}/vision/slot-status", json=body, headers={"X-Edge-Key": key}, timeout=5)
        r.raise_for_status()
        return True
    except requests.RequestException as exc:
        print(f"[edge] POST failed (backend down? backing off): {exc}", flush=True)
        return False


def main() -> None:
    slots = load_slots()
    det = SlotDetector(
        slots,
        iou_threshold=0.30,
        smoothing_window=5,
        vehicle_conf=0.25,
        use_clahe=False,
    )
    last_status: dict[int, bool] = {int(s["slot_id"]): None for s in slots}
    last_heartbeat = 0.0
    backoff = 1.0

    print(f"[edge] lot={LOT_ID} source={SOURCE} backend={BACKEND_URL}", flush=True)

    while True:
        loop_start = time.time()
        cap = None
        try:
            cap = open_source(SOURCE)
            backoff = 1.0
            while True:
                ok, frame = cap.read()
                if not ok or frame is None:
                    # end of video file: loop it
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue

                results = det.process_dicts(frame)
                now = time.time()
                changed = []
                heartbeat = now - last_heartbeat >= HEARTBEAT_INTERVAL

                for r in results:
                    sid = r["slot_id"]
                    prev = last_status[sid]
                    if prev is None or prev != r["occupied"]:
                        changed.append(r)
                        last_status[sid] = r["occupied"]

                if changed or heartbeat:
                    payload = changed if changed else results
                    if post(BACKEND_URL, EDGE_KEY, LOT_ID, payload):
                        backoff = 1.0
                    if heartbeat:
                        last_heartbeat = now

                # throttle to INTERVAL seconds per processed frame
                elapsed = time.time() - loop_start
                sleep_for = max(0.0, INTERVAL - elapsed)
                time.sleep(sleep_for)
                loop_start = time.time()

        except KeyboardInterrupt:
            print("[edge] stopped by user", flush=True)
            break
        except Exception as exc:  # never crash: reopen source and retry
            print(f"[edge] error: {exc}; retrying in {backoff:.1f}s", flush=True)
            time.sleep(backoff)
            backoff = min(backoff * 2, 30.0)
        finally:
            if cap is not None:
                try:
                    cap.release()
                except Exception:
                    pass


if __name__ == "__main__":
    main()
