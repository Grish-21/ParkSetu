"""ParkSetu slot detector.

Loads YOLOv8n, detects COCO vehicle classes (car 2, motorcycle 3, bus 5, truck 7),
and decides occupied/free per slot polygon using Shapely overlap + temporal
majority-vote smoothing. CPU-only friendly.

Usage:
    from ml.vision.detector import SlotDetector
    det = SlotDetector(slots, iou_threshold=0.30, smoothing_window=5)
    results = det.process(frame)  # [{slot_id, occupied, confidence}]
"""
from __future__ import annotations

import collections
from dataclasses import dataclass, field
from typing import Iterable

import cv2
import numpy as np
from shapely.geometry import Polygon, Point
from shapely.validation import explain_validity

from vision.config import VEHICLE_CLASSES  # noqa: E402


@dataclass
class SlotResult:
    slot_id: int
    occupied: bool
    confidence: float


class SlotDetector:
    """Frame -> per-slot occupied/free + confidence, with temporal smoothing."""

    def __init__(
        self,
        slots: Iterable[dict],
        model_path: str = "yolov8n.pt",
        iou_threshold: float = 0.30,
        smoothing_window: int = 5,
        vehicle_conf: float = 0.25,
        use_clahe: bool = False,
    ):
        from ultralytics import YOLO  # imported lazily so config imports without torch

        self.slots = list(slots)
        self.model = YOLO(model_path)
        self.iou_threshold = iou_threshold
        self.smoothing_window = smoothing_window
        self.vehicle_conf = vehicle_conf
        self.use_clahe = use_clahe

        # slot id -> shapely polygon + area
        self._polygons: dict[int, Polygon] = {}
        self._areas: dict[int, float] = {}
        for s in self.slots:
            poly = Polygon(s["polygon"])
            if not poly.is_valid:
                poly = poly.buffer(0)  # self-intersection fix
            self._polygons[int(s["slot_id"])] = poly
            self._areas[int(s["slot_id"])] = poly.area if poly.area > 0 else 1.0

        # smoothing history: slot_id -> deque of bools
        self._history: dict[int, collections.deque] = {
            int(s["slot_id"]): collections.deque(maxlen=smoothing_window) for s in self.slots
        }

        self._clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)) if use_clahe else None

    # ------------------------------------------------------------------ detect
    def _enhance(self, frame: np.ndarray) -> np.ndarray:
        if self._clahe is None:
            return frame
        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
        lab[:, :, 0] = self._clahe.apply(lab[:, :, 0])
        return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

    def _vehicle_boxes(self, frame: np.ndarray) -> list[tuple[float, float, float, float, float, int]]:
        """Return [(x1, y1, x2, y2, conf, cls)] for vehicle detections."""
        results = self.model(frame, verbose=False)[0]
        boxes = []
        if results.boxes is None:
            return boxes
        for b in results.boxes:
            cls = int(b.cls[0])
            if cls not in VEHICLE_CLASSES:
                continue
            conf = float(b.conf[0])
            if conf < self.vehicle_conf:
                continue
            x1, y1, x2, y2 = [float(v) for v in b.xyxy[0]]
            boxes.append((x1, y1, x2, y2, conf, cls))
        return boxes

    def _slot_raw(self, slot_id: int, boxes: list) -> tuple[bool, float]:
        """Raw (unsmoothed) occupied decision + confidence for one slot."""
        poly = self._polygons[slot_id]
        area = self._areas[slot_id]
        best_conf = 0.0
        occupied = False

        for x1, y1, x2, y2, conf, cls in boxes:
            box_poly = Polygon([(x1, y1), (x2, y1), (x2, y2), (x1, y2)])
            cx, cy = (x1 + x2) / 2.0, (y1 + y2) / 2.0
            center_in = poly.contains(Point(cx, cy))
            overlap = box_poly.intersection(poly).area / area if area > 0 else 0.0
            hit = center_in or overlap > self.iou_threshold
            if hit:
                occupied = True
                if conf > best_conf:
                    best_conf = conf

        if occupied:
            confidence = best_conf
        else:
            # free slot: confidence = 1 - strongest vehicle confidence anywhere
            # in the frame (documented choice: high when no vehicle detected)
            confidence = 1.0 - best_conf if best_conf > 0 else 1.0
            confidence = max(0.0, min(1.0, confidence))
        return occupied, round(confidence, 2)

    # ---------------------------------------------------------------- smoothing
    def _smooth(self, slot_id: int, occupied: bool) -> bool:
        hist = self._history[slot_id]
        hist.append(occupied)
        return sum(hist) > len(hist) / 2  # majority vote

    # ------------------------------------------------------------------ public
    def process(self, frame: np.ndarray) -> list[SlotResult]:
        """Detect on one frame and return smoothed per-slot results."""
        if self.use_clahe:
            frame = self._enhance(frame)
        boxes = self._vehicle_boxes(frame)
        results: list[SlotResult] = []
        for s in self.slots:
            sid = int(s["slot_id"])
            raw_occ, conf = self._slot_raw(sid, boxes)
            occ = self._smooth(sid, raw_occ)
            results.append(SlotResult(slot_id=sid, occupied=occ, confidence=conf))
        return results

    def process_dicts(self, frame: np.ndarray) -> list[dict]:
        """Like process() but returns plain dicts for JSON posting."""
        return [{"slot_id": r.slot_id, "occupied": r.occupied, "confidence": r.confidence} for r in self.process(frame)]
