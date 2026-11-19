"""ParkSetu detector evaluation.

Computes precision / recall / F1 per lighting tag (day, dusk, night).

Expected inputs:
  --images-dir   folder with images
  --labels       CSV with columns: filename,slot_id,occupied,lighting
                 occupied: 1=occupied, 0=free
                 lighting: day | dusk | night
  --slots        slots JSON (default ml/vision/slots_example.json)

The slot polygons must be in pixel coordinates matching the images.
If no data is present, the script prints the expected format and exits.

Run:
  python -m eval.evaluate_detector --images-dir data/ --labels labels.csv
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

import cv2

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from vision.detector import SlotDetector  # noqa: E402
from vision.config import SLOTS_FILE  # noqa: E402


def load_labels(path: Path):
    rows = []
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows.append(
                {
                    "filename": row["filename"],
                    "slot_id": int(row["slot_id"]),
                    "occupied": int(row["occupied"]) == 1,
                    "lighting": row["lighting"],
                }
            )
    return rows


def evaluate(images_dir: Path, labels_path: Path, slots_path: Path = SLOTS_FILE):
    if not images_dir.exists():
        print(f"images dir not found: {images_dir}", flush=True)
        _print_help()
        return
    if not labels_path.exists():
        print(f"labels file not found: {labels_path}", flush=True)
        _print_help()
        return
    if not slots_path.exists():
        print(f"slots file not found: {slots_path}", flush=True)
        _print_help()
        return

    with open(slots_path, encoding="utf-8") as f:
        slots = json.load(f)

    det = SlotDetector(slots, smoothing_window=1)  # no smoothing for evaluation
    labels = load_labels(labels_path)

    # group by image
    by_image = defaultdict(list)
    for r in labels:
        by_image[r["filename"]].append(r)

    stats = defaultdict(lambda: {"tp": 0, "fp": 0, "fn": 0})

    for filename, gt_list in by_image.items():
        img_path = images_dir / filename
        if not img_path.exists():
            print(f"warning: image not found, skipping: {img_path}", flush=True)
            continue
        frame = cv2.imread(str(img_path))
        if frame is None:
            print(f"warning: could not read image: {img_path}", flush=True)
            continue

        preds = {r["slot_id"]: r["occupied"] for r in det.process_dicts(frame)}
        gt = {r["slot_id"]: r["occupied"] for r in gt_list}
        lighting = gt_list[0]["lighting"]

        for slot_id, g in gt.items():
            p = preds.get(slot_id, False)
            if g and p:
                stats[lighting]["tp"] += 1
            elif p and not g:
                stats[lighting]["fp"] += 1
            elif g and not p:
                stats[lighting]["fn"] += 1

    _print_table(stats)


def _print_table(stats):
    lines = ["| lighting | precision | recall | F1 | support |", "|---|---|---|---|---|"]
    for lighting in ("day", "dusk", "night"):
        s = stats.get(lighting, {"tp": 0, "fp": 0, "fn": 0})
        tp, fp, fn = s["tp"], s["fp"], s["fn"]
        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0
        support = tp + fn
        lines.append(
            f"| {lighting} | {precision:.3f} | {recall:.3f} | {f1:.3f} | {support} |"
        )
    lines.append("")
    print("\n".join(lines), flush=True)


def _print_help():
    print(
        "No evaluation data found.\n"
        "Expected:\n"
        "  images-dir/  contains images referenced by labels.csv\n"
        "  labels.csv   columns: filename,slot_id,occupied,lighting\n"
 
        "                 occupied: 1=occupied 0=free; lighting: day|dusk|night\n"
        "  slots JSON   e.g. ml/vision/slots_example.json with per-slot polygons\n"
        "Example:\n"
        "  python -m eval.evaluate_detector --images-dir data/ --labels labels.csv",
        flush=True,
    )


def main():
    parser = argparse.ArgumentParser(description="Evaluate detector precision/recall/F1 by lighting")
    parser.add_argument("--images-dir", default="data")
    parser.add_argument("--labels", default="labels.csv")
    parser.add_argument("--slots", default=str(SLOTS_FILE))
    args = parser.parse_args()
    evaluate(Path(args.images_dir), Path(args.labels), Path(args.slots))


if __name__ == "__main__":
    main()
