"""ParkSetu ML configuration.

All values can be overridden via environment variables (same name, upper case).
Never edit backend/ or frontend/. The camera is optional: use the simulator.
"""
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8000")
EDGE_KEY: str = os.getenv("EDGE_API_KEY", "e54pL6R66HzZIWsghegixR0LL_j59SFb")
LOT_ID: int = int(os.getenv("LOT_ID", "1"))
SOURCE: str | int | None = os.getenv("SOURCE", "0")  # video path, webcam index, or RTSP URL
INTERVAL: float = float(os.getenv("INTERVAL", "3"))  # seconds between processed frames

SLOTS_FILE: Path = ROOT / "vision" / "slots_example.json"

IOU_THRESHOLD: float = float(os.getenv("IOU_THRESHOLD", "0.30"))  # overlap > 30% of slot area
SMOOTHING_WINDOW: int = int(os.getenv("SMOOTHING_WINDOW", "5"))  # temporal majority vote
VEHICLE_CONF: float = float(os.getenv("VEHICLE_CONF", "0.25"))  # YOLO detection confidence
USE_CLAHE: bool = os.getenv("USE_CLAHE", "0").lower() in ("1", "true", "yes")

# COCO vehicle classes kept by the detector
VEHICLE_CLASSES: dict[int, str] = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}

HEARTBEAT_INTERVAL: float = float(os.getenv("HEARTBEAT_INTERVAL", "30"))  # seconds

YOLO_MODEL: str = os.getenv("YOLO_MODEL", "yolov8n.pt")

# Mock backend used before the real backend is up
MOCK_BACKEND_URL: str = os.getenv("MOCK_BACKEND_URL", "http://localhost:8001")

# Simulator
SIMULATOR_SLOTS: str = os.getenv("SIMULATOR_SLOTS", "1,2,3,4,5")
SIMULATOR_INTERVAL: float = float(os.getenv("SIMULATOR_INTERVAL", "4"))
SIMULATOR_SCENARIO: str = os.getenv("SIMULATOR_SCENARIO", "normal")
SIMULATOR_OVERSTAY_SLOT: int | None = (
    int(os.getenv("SIMULATOR_OVERSTAY_SLOT")) if os.getenv("SIMULATOR_OVERSTAY_SLOT") else None
)
