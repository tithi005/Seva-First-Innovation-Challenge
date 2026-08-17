"""
Precompute evaluation metrics (confusion matrix + ROC curve) from the test split.
Run once: python api/precompute_eval.py
Saves: api/eval_cache.json
"""
import sys, json
from pathlib import Path

import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    confusion_matrix, roc_curve, auc,
    precision_score, recall_score, f1_score, accuracy_score
)

BASE = Path(__file__).parent.parent

print("Loading dataset...")
df = pd.read_csv(BASE / "train_delay_dataset (3).csv")

print("Loading models...")
clf_pipe     = joblib.load(BASE / "delay_classifier_pipeline.pkl")
threshold_val = joblib.load(BASE / "delay_threshold.pkl")

features = [
    "train_type", "priority", "section_id", "day_of_week", "is_weekend",
    "time_of_day_bucket", "season", "upstream_delay_min",
    "section_congestion_level", "weather_flag", "track_type",
]
X = df[features]
y = (df["delay_min"] > threshold_val).astype(int)

_, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
print(f"Test set size: {len(X_test)}")

print("Running predictions...")
y_pred  = clf_pipe.predict(X_test)
y_proba = clf_pipe.predict_proba(X_test)[:, 1]

# ── Confusion Matrix ─────────────────────────────────────────────────────────
cm = confusion_matrix(y_test, y_pred)
tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])

# ── ROC Curve ────────────────────────────────────────────────────────────────
fpr_arr, tpr_arr, _ = roc_curve(y_test, y_proba)
roc_auc = float(auc(fpr_arr, tpr_arr))

# Downsample to 60 points for the chart
idx = np.round(np.linspace(0, len(fpr_arr) - 1, 60)).astype(int)
roc_points = [
    {"fpr": round(float(fpr_arr[i]), 4), "tpr": round(float(tpr_arr[i]), 4)}
    for i in idx
]

# ── Other metrics ────────────────────────────────────────────────────────────
acc       = float(accuracy_score(y_test, y_pred))
precision = float(precision_score(y_test, y_pred))
recall    = float(recall_score(y_test, y_pred))
f1        = float(f1_score(y_test, y_pred))

result = {
    "confusion_matrix": {"tn": tn, "fp": fp, "fn": fn, "tp": tp},
    "roc": {"points": roc_points, "auc": round(roc_auc, 4)},
    "metrics": {
        "accuracy":  round(acc * 100, 2),
        "precision": round(precision * 100, 2),
        "recall":    round(recall * 100, 2),
        "f1":        round(f1 * 100, 2),
        "test_size": len(X_test),
    },
}

out_path = Path(__file__).parent / "eval_cache.json"
out_path.write_text(json.dumps(result, indent=2))
print(f"Saved → {out_path}")
print(f"  Accuracy:  {acc*100:.2f}%")
print(f"  AUC:       {roc_auc:.4f}")
print(f"  CM:  TN={tn}, FP={fp}, FN={fn}, TP={tp}")
print(f"  F1:  {f1*100:.2f}%")
