"""Generate realistic stay-duration data per hour/weekday/lot type.

Output columns: hour, weekday, lot_type, stay_minutes

Distributions (simple, demo-friendly):
  mall        : longer stays, peak midday & evening
  petrol_pump : short stays (~20 min)
  station     : medium stays (~60 min), peak rush hours
"""
from __future__ import annotations

import argparse
import csv
import random
from pathlib import Path

LOT_TYPES = ["mall", "petrol_pump", "station"]


def base_mean(lot_type: str, hour: int, weekday: int, rng: random.Random) -> float:
    is_weekend = weekday >= 5
    if lot_type == "mall":
        mean = 70
        if 11 <= hour <= 14:
            mean += 40
        if 18 <= hour <= 21:
            mean += 30
        if is_weekend:
            mean += 20
    elif lot_type == "petrol_pump":
        mean = 18
        if 7 <= hour <= 10 or 17 <= hour <= 20:
            mean += 8
    else:  # station
        mean = 55
        if 7 <= hour <= 10 or 17 <= hour <= 20:
            mean += 25
        if is_weekend:
            mean -= 10
    return max(5, mean)


def generate(n_per_cell: int = 40, seed: int = 42) -> list[dict]:
    rng = random.Random(seed)
    rows = []
    for lot_type in LOT_TYPES:
        for hour in range(24):
            for weekday in range(7):
                mean = base_mean(lot_type, hour, weekday, rng)
                for _ in range(n_per_cell):
                    # lognormal-ish stay duration with a floor
                    stay = rng.gauss(mean, mean * 0.35)
                    stay = max(5, stay)
                    rows.append(
                        {
                            "hour": hour,
                            "weekday": weekday,
                            "lot_type": lot_type,
                            "stay_minutes": round(stay, 1),
                        }
                    )
    return rows


def write_csv(rows: list[dict], path: Path) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["hour", "weekday", "lot_type", "stay_minutes"])
        w.writeheader()
        w.writerows(rows)


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic dwell-time data")
    parser.add_argument("--out", default="ml/data/dwell_synth.csv")
    parser.add_argument("--per-cell", type=int, default=40)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    rows = generate(n_per_cell=args.per_cell, seed=args.seed)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    write_csv(rows, out)
    print(f"wrote {len(rows)} rows to {out}", flush=True)


if __name__ == "__main__":
    main()
