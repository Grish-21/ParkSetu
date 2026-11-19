"""ParkSetu slot calibration tool.

Click the 4 corners of each slot on an image, press `n` for next slot, `s` to save.
Writes slots.json. Optionally uploads polygons to POST /lots/{id}/slots with an
owner JWT (--token) and stores the returned slot ids.

Run:
  python -m vision.calibrate --image frame.jpg --lot-id 1
  python -m vision.calibrate --image frame.jpg --lot-id 1 --labels A1,A2,A3 --token <jwt>
  python -m vision.calibrate --image frame.jpg --lot-id 1 --token <jwt> --upload
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import cv2
import requests

from vision.config import BACKEND_URL, SLOTS_FILE  # noqa: E402


class Calibrate:
    def __init__(self, image_path: str, lot_id: int, labels: list[str] | None, upload: bool, token: str | None):
        self.image_path = image_path
        self.lot_id = lot_id
        self.labels = labels
        self.upload = upload
        self.token = token
        self.frame = cv2.imread(image_path)
        if self.frame is None:
            raise SystemExit(f"could not read image: {image_path}")
        self.display = self.frame.copy()
        self.points: list[tuple[int, int]] = []
        self.slots: list[dict] = []
        self.slot_idx = 0
        self.done = False
        self.window = "ParkSetu Calibrate - click 4 corners, n=next, s=save, q=quit"
        cv2.namedWindow(self.window)
        cv2.setMouseCallback(self.window, self._on_mouse)

    def _on_mouse(self, event, x, y, flags, param):
        if event == cv2.EVENT_LBUTTONDOWN and len(self.points) < 4:
            self.points.append((x, y))
            self._draw()

    def _next_label(self) -> str:
        if self.labels and self.slot_idx < len(self.labels):
            return self.labels[self.slot_idx]
        return f"S{self.slot_idx + 1}"

    def _draw(self):
        self.display = self.frame.copy()
        # draw completed slots
        for slot in self.slots:
            pts = [tuple(p) for p in slot["polygon"]]
            cv2.polylines(self.display, [np_pts(pts)], True, (0, 255, 0), 2)
            cv2.putText(self.display, slot["label"], pts[0], cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        # draw in-progress points
        for p in self.points:
            cv2.circle(self.display, p, 5, (0, 0, 255), -1)
        if len(self.points) > 1:
            cv2.polylines(self.display, [np_pts(self.points)], False, (0, 0, 255), 2)
        cv2.putText(
            self.display,
            f"slot {self.slot_idx + 1}: {self._next_label()}  points={len(self.points)}/4  "
            f"(n=next s=save q=quit)",
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255, 255, 255),
            2,
        )
        cv2.imshow(self.window, self.display)

    def _save_slot(self):
        if len(self.points) != 4:
            print("need exactly 4 points to save a slot", flush=True)
            return
        label = self._next_label()
        self.slots.append({"label": label, "polygon": [list(p) for p in self.points]})
        print(f"saved slot {label}: {self.points}", flush=True)
        self.points = []
        self.slot_idx += 1
        self._draw()

    def _write_json(self, path: Path):
        out = []
        for i, slot in enumerate(self.slots):
            out.append({"slot_id": i + 1, "label": slot["label"], "polygon": slot["polygon"]})
        with open(path, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2)
        print(f"wrote {len(out)} slots to {path}", flush=True)

    def _upload(self, base_url: str, token: str):
        # first create slots via POST /lots/{id}/slots
        body = [{"label": s["label"], "polygon": s["polygon"], "is_buffer": False} for s in self.slots]
        try:
            r = requests.post(
                f"{base_url}/lots/{self.lot_id}/slots",
                json=body,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                timeout=10,
            )
            r.raise_for_status()
            created = r.json()
        except requests.RequestException as exc:
            print(f"upload failed: {exc}", flush=True)
            return
        # store returned ids
        for slot, created_slot in zip(self.slots, created):
            slot["server_slot_id"] = created_slot.get("id")
        print(f"uploaded {len(created)} slots to lot {self.lot_id}", flush=True)

    def run(self):
        self._draw()
        while not self.done:
            key = cv2.waitKey(30) & 0xFF
            if key == ord("n"):
                self._save_slot()
            elif key == ord("s"):
                self._save_slot()
                self.done = True
            elif key == ord("q"):
                self.done = True
        cv2.destroyAllWindows()

        out_path = SLOTS_FILE
        self._write_json(out_path)

        if self.upload:
            if not self.token:
                print("--upload requires --token", flush=True)
            else:
                self._upload(BACKEND_URL, self.token)
                # re-write with server ids if any
                if any("server_slot_id" in s for s in self.slots):
                    self._write_json(out_path)


def np_pts(pts):
    import numpy as np

    return np.array(pts, dtype=np.int32)


def main():
    parser = argparse.ArgumentParser(description="ParkSetu slot calibration tool")
    parser.add_argument("--image", required=True, help="frame image to calibrate on")
    parser.add_argument("--lot-id", type=int, required=True, help="lot id")
    parser.add_argument("--labels", default=None, help="comma-separated slot labels (e.g. A1,A2,A3)")
    parser.add_argument(
        "--token", default=None, help="owner JWT for uploading polygons to POST /lots/{id}/slots"
    )
    parser.add_argument("--upload", action="store_true", help="upload polygons to the backend")
    args = parser.parse_args()

    labels = args.labels.split(",") if args.labels else None
    app = Calibrate(args.image, args.lot_id, labels, args.upload, args.token)
    app.run()


if __name__ == "__main__":
    main()
