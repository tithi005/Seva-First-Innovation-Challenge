"""Trained delay-model loading and inference.

The pickles live in the repo root. They are loaded once and reused.
"""
from functools import lru_cache
from pathlib import Path

import joblib
import pandas as pd

BASE = Path(__file__).parent.parent

# Column order used when the pipelines were fitted.
FEATURE_ORDER = [
    "train_type",
    "priority",
    "section_id",
    "day_of_week",
    "is_weekend",
    "time_of_day_bucket",
    "season",
    "upstream_delay_min",
    "section_congestion_level",
    "weather_flag",
    "track_type",
]


@lru_cache(maxsize=1)
def _pipelines():
    clf = joblib.load(BASE / "delay_classifier_pipeline.pkl")
    reg = joblib.load(BASE / "delay_model_pipeline.pkl")
    threshold = int(joblib.load(BASE / "delay_threshold.pkl"))
    return clf, reg, threshold


def predict_delay(features: dict) -> dict:
    """Run the two-stage classifier + regressor on one row of features."""
    clf, reg, threshold = _pipelines()

    row = {name: features[name] for name in FEATURE_ORDER}
    df = pd.DataFrame([row])

    proba = clf.predict_proba(df)[0]
    is_delayed = int(clf.predict(df)[0])
    predicted = float(reg.predict(df)[0])

    return {
        "is_delayed": bool(is_delayed),
        "delay_probability_pct": round(float(proba[1]) * 100, 1),
        "confidence_pct": round(float(max(proba)) * 100, 1),
        "predicted_delay_min": round(predicted, 1),
        "threshold_min": threshold,
    }


def warmup() -> None:
    """Load the pickles ahead of the first request (a few seconds of disk I/O)."""
    _pipelines()
