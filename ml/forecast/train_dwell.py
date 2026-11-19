"""Train/evaluate a dwell-time model on synthetic data.

Prints baseline MAE (global mean) vs model MAE, then saves ml/forecast/model.pkl.

Run:
  python -m forecast.train_dwell
"""
from __future__ import annotations

import json
import pickle
from pathlib import Path

import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.preprocessing import OneHotEncoder

from forecast.synth_data import generate, LOT_TYPES  # noqa: E402

MODEL_PATH = Path(__file__).resolve().parent / "model.pkl"


def make_features(rows):
    X = []
    y = []
    enc = OneHotEncoder(sparse_output=False, handle_unknown="ignore")
    lot_enc = enc.fit_transform(np.array(LOT_TYPES).reshape(-1, 1))
    lot_map = {lt: lot_enc[i] for i, lt in enumerate(LOT_TYPES)}
    for r in rows:
        X.append([r["hour"], r["weekday"]] + list(lot_map[r["lot_type"]]))
        y.append(r["stay_minutes"])
    return np.array(X, dtype=float), np.array(y, dtype=float), enc


def main():
    rows = generate()
    X, y, enc = make_features(rows)

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)

    # baseline: global mean
    baseline_pred = np.full_like(yte, ytr.mean(), dtype=float)
    baseline_mae = mean_absolute_error(yte, baseline_pred)

    # model
    model = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
    model.fit(Xtr, ytr)
    model_mae = mean_absolute_error(yte, model.predict(Xte))

    print(f"baseline MAE (global mean): {baseline_mae:.2f} minutes", flush=True)
    print(f"model MAE (RandomForest):   {model_mae:.2f} minutes", flush=True)

    with open(MODEL_PATH, "wb") as f:
        pickle.dump({"model": model, "encoder": enc, "lot_types": LOT_TYPES}, f)
    print(f"saved model to {MODEL_PATH}", flush=True)


if __name__ == "__main__":
    main()
