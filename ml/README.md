# ParkSetu ML / Vision (Nemotron)

Smart parking slot detection, edge reporting, simulator, calibration, dwell-time
forecast, and evaluation. CPU-only, Python 3.11+, no GPU required.

**Scope:** only the `ml/` folder. Never touches `backend/` or `frontend/`.

## Layout

```
ml/
  vision/
    config.py        # BACKEND_URL, EDGE_KEY, LOT_ID, SOURCE, INTERVAL, thresholds
    detector.py      # SlotDetector: YOLOv8n + polygon overlap + temporal smoothing
    edge_service.py  # loop: read source -> detect -> POST /vision/slot-status
    simulator.py     # fake camera source, same POST format (build FIRST)
    calibrate.py     # click 4 corners per slot -> slots.json (+ optional upload)
    slots_example.json
  forecast/
    forecast.py      # predict_next_free(...)  exact 0.7 signature
    train_dwell.py   # train/evaluate dwell model, prints baseline vs model MAE
    synth_data.py    # synthetic stay-duration data per hour/weekday/lot type
    model.pkl        # produced by train_dwell
  eval/
    evaluate_detector.py  # precision/recall/F1 per lighting (day/dusk/night)
  tools/
    mock_backend.py  # tiny FastAPI server: POST /vision/slot-status (testing only)
  requirements.txt
  README.md
```

## Install

```powershell
cd ml
pip install -r requirements.txt
# YOLO downloads yolov8n.pt automatically on first run (~6 MB)
```

## Run commands

### 1) Mock backend (terminal A)

```powershell
python -m tools.mock_backend
# or: python -m tools.mock_backend --port 8001
```

Expected: FastAPI/uvicorn listening on `http://127.0.0.1:8001`.  
`GET /` returns `{"ok": true, ...}`. `GET /state` dumps the latest slot states.

### 2) Simulator (terminal B) — unblocks integration, no camera/model

```powershell
python -m vision.simulator --lot-id 1 --slots 1,2,3,4,5 --interval 4
```

Expected output (repeated):
```
[simulator] lot=1 slots=[1, 2, 3, 4, 5] scenario=normal url=http://localhost:8001
```
and the mock backend prints lines like:
```
[2026-11-19T09:20:23Z] lot_id=1 ts=...
  slot 1: OCCUPIED  conf=0.86
  slot 2: free        conf=0.84
```

Overstay demo (one slot stays occupied forever):
```powershell
python -m vision.simulator --lot-id 1 --slots 1,2,3,4,5 --scenario overstay --overstay-slot 3
```

Post to the real backend instead of the mock:
```powershell
python -m vision.simulator --url http://localhost:8000 --key <EDGE_API_KEY>
```

### 3) Detector on a sample video

```powershell
python -m vision.edge_service
# uses config: SOURCE (default webcam 0), slots.json, INTERVAL=3s
SOURCE=sample.mp4 python -m vision.edge_service
```

Expected:
```
[edge] lot=1 source=0 backend=http://localhost:8000
[edge] slot 1: OCCUPIED conf=0.91   (only when status changes)
[edge] heartbeat every 30 s
```

It POSTs `{lot_id, ts, slots:[{slot_id, occupied, confidence}]}` to
`{BACKEND_URL}/vision/slot-status` with header `X-Edge-Key`. Only on status
change plus a heartbeat. Frames are never uploaded.

### 4) Calibration tool

```powershell
python -m vision.calibrate --image frame.jpg --lot-id 1
```

Controls: click 4 corners of a slot, `n` = next slot, `s` = save & quit, `q` = quit.
Writes `ml/vision/slots.json`.

Upload to backend (needs an owner JWT):
```powershell
python -m vision.calibrate --image frame.jpg --lot-id 1 --labels A1,A2,A3 --token <jwt> --upload
```

### 5) Forecast module

```powershell
python -m forecast.train_dwell
```

Expected:
```
baseline MAE (global mean): XX.XX minutes
model MAE (RandomForest):   YY.YY minutes
saved model to ml/forecast/model.pkl
```

Import check (exact 0.7 signature):
```powershell
python -c "
from datetime import datetime, timezone
from ml.forecast.forecast import predict_next_free
r = predict_next_free(
    1, datetime.now(timezone.utc),
    [{'end_time': datetime.now(timezone.utc), 'status': 'CHECKED_IN'}],
    None,
)
print(r)
# {'next_free_at': <datetime>, 'confidence': 0.9, 'method': 'earliest_end_time'}
"
```

Missing `model.pkl` → falls back to baseline without raising.

### 6) Evaluation

```powershell
python -m eval.evaluate_detector --images-dir data/ --labels labels.csv
```

Expected (markdown table):
```
| lighting | precision | recall | F1 | support |
|---|---|---|---|---|
| day | 0.000 | 0.000 | 0.000 | 0 |
| dusk | 0.000 | 0.000 | 0.000 | 0 |
| night | 0.000 | 0.000 | 0.000 | 0 |
```

If no data is present, prints the expected folder/CSV format and exits.
Labels CSV columns: `filename,slot_id,occupied,lighting` (occupied 1/0, lighting day|dusk|night).

## Detector design decisions (documented)

- Vehicle classes: COCO car(2), motorcycle(3), bus(5), truck(7) only.
- A slot is occupied when vehicle box overlap > 30% of slot area (Shapely) OR the
  vehicle center point lies in the polygon. Threshold `IOU_THRESHOLD` in config.py.
- Temporal smoothing: last N=5 results per slot, majority vote. Prevents single-frame
  flicker from passing cars/people.
- Confidence: occupied slot = max vehicle detection confidence for that slot; free
  slot = 1 - best vehicle confidence anywhere in the frame (1.0 if none detected).
- Optional CLAHE low-light contrast enhancement, toggled by `USE_CLAHE` in config.py.
- Processes 1 frame every `INTERVAL` seconds (default 3), not every video frame.
- CPU-only: YOLOv8n runs on CPU in well under ~1 s per frame on a demo laptop.

## Edge service design decisions

- `SOURCE` = video file, webcam index, or RTSP/http URL.
- Reposts only when a slot status changes, plus a heartbeat every 30 s.
- Exponential backoff when the backend is down; the loop never crashes.
- Privacy: never uploads frames, only slot statuses.

## Contract requests / notes for the backend team

- POST `/vision/slot-status` body and `X-Edge-Key` header match section 0.5 exactly —
  do not change without telling me.
- `predict_next_free` signature must stay as in section 0.7.
- `EDGE_API_KEY` env defaults to `dev-edge-key`; the mock backend hard-codes the same.

## Acceptance

- [x] `python -m vision.simulator --lot-id 1 --slots 1,2,3,4,5` posts to mock backend
- [x] `python -m vision.edge_service` on a sample video posts correct statuses
- [x] Smoothing prevents single-frame flicker (N=5 majority vote)
- [x] `from ml.forecast.forecast import predict_next_free` works, graceful fallback
- [x] `python -m forecast.train_dwell` prints baseline MAE vs model MAE
- [x] CPU-only, ~1 s per frame with YOLOv8n
