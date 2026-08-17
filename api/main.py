"""
Amogh Rail — ML Inference API
Run: uvicorn api.main:app --reload --port 8000
"""
from pathlib import Path
import json

import joblib
import pandas as pd
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── Model loading (at import time — safe for single-process uvicorn) ──────────
BASE = Path(__file__).parent.parent

clf_pipe      = joblib.load(BASE / "delay_classifier_pipeline.pkl")
reg_pipe      = joblib.load(BASE / "delay_model_pipeline.pkl")
threshold_val = int(joblib.load(BASE / "delay_threshold.pkl"))

_eval_cache_path = Path(__file__).parent / "eval_cache.json"
eval_cache = json.loads(_eval_cache_path.read_text()) if _eval_cache_path.exists() else None

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Amogh Rail ML API",
    description="Two-stage delay prediction: RandomForest classifier + HistGradientBoosting regressor",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request / Response Schemas ────────────────────────────────────────────────
class PredictRequest(BaseModel):
    train_type:               str   = Field(..., example="Express")
    priority:                 int   = Field(..., ge=1, le=3, example=1)
    section_id:               str   = Field(..., example="BWN-GUS")
    day_of_week:              int   = Field(..., ge=1, le=7, example=1)
    is_weekend:               int   = Field(..., ge=0, le=1, example=0)
    time_of_day_bucket:       str   = Field(..., example="Peak")
    season:                   str   = Field(..., example="Monsoon")
    upstream_delay_min:       float = Field(..., ge=0, example=5.0)
    section_congestion_level: float = Field(..., ge=0, le=1, example=0.75)
    weather_flag:             int   = Field(..., ge=0, le=2, example=1)
    track_type:               str   = Field(..., example="Double")

class PredictResponse(BaseModel):
    is_delayed:          bool
    confidence:          float
    delay_probability:   float
    predicted_delay_min: float
    threshold_min:       int
    model_used:          str

class TrainOptRequest(BaseModel):
    id: str
    priority: int
    travel_time: int

class OptimizeRequest(BaseModel):
    trains: List[TrainOptRequest]

# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "Amogh Rail ML API", "version": "1.0.0"}

@app.post("/predict", response_model=PredictResponse, tags=["Inference"])
def predict(req: PredictRequest):
    try:
        df = pd.DataFrame([req.model_dump()])
        
        is_delayed_raw = int(clf_pipe.predict(df)[0])
        proba          = clf_pipe.predict_proba(df)[0]   # [P(on-time), P(delayed)]
        delay_prob_pct = round(float(proba[1]) * 100, 1)
        confidence_pct = round(float(max(proba)) * 100, 1)
        pred_delay     = round(float(reg_pipe.predict(df)[0]), 1)

        return PredictResponse(
            is_delayed          = bool(is_delayed_raw),
            confidence          = confidence_pct,
            delay_probability   = delay_prob_pct,
            predicted_delay_min = pred_delay,
            threshold_min       = threshold_val,
            model_used          = "RandomForestClassifier + HistGradientBoostingRegressor",
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

@app.get("/model-info", tags=["Metadata"])
def model_info():
    return {
        "classifier": {
            "name":              "RandomForestClassifier",
            "accuracy_pct":      87.17,
            "delay_threshold_min": threshold_val,
            "n_features":        11,
            "training_records":  50000,
        },
        "regressor": {
            "name": "HistGradientBoostingRegressor",
            "mae_min": 1.59,
            "r2":      0.878,
        },
        "dataset": {
            "total_records":   50000,
            "delayed_pct":     47.2,
            "on_time_pct":     52.8,
            "avg_delay_all":   10.47,
            "n_sections":      8,
            "sections": [
                "HWH-BLY", "BLY-BDC", "BDC-SHE", "SHE-SKG",
                "SKG-MMR", "MMR-BWN", "BWN-GUS", "GUS-PAN",
            ],
            "train_types": ["Express", "Passenger", "Suburban", "Freight"],
            "seasons":     ["Summer", "Spring", "Monsoon", "Winter"],
        },
        "feature_importance": [
            {"feature": "weather_flag",             "importance_pct": 31.80},
            {"feature": "upstream_delay_min",       "importance_pct": 24.47},
            {"feature": "section_congestion_level", "importance_pct": 15.65},
            {"feature": "train_type",               "importance_pct": 6.50},
            {"feature": "priority",                 "importance_pct": 5.28},
            {"feature": "season",                   "importance_pct": 3.68},
            {"feature": "day_of_week",              "importance_pct": 3.53},
            {"feature": "section_id",               "importance_pct": 3.20},
            {"feature": "track_type",               "importance_pct": 2.69},
            {"feature": "time_of_day_bucket",       "importance_pct": 2.46},
            {"feature": "is_weekend",               "importance_pct": 0.74},
        ],
    }

@app.get("/eval-metrics", tags=["Metadata"])
def eval_metrics():
    if eval_cache is None:
        raise HTTPException(
            status_code=503,
            detail="Eval cache not found. Run: python api/precompute_eval.py"
        )
    return eval_cache

@app.post("/optimize", tags=["Optimization"])
def run_optimization(req: OptimizeRequest):
    from api.optimizer import solve_dispatch, run_simulation, solve_fifo, calculate_cost
    
    trains_data = [t.model_dump() for t in req.trains]
    
    # 1. Manual/Baseline (FIFO)
    manual_schedule = solve_fifo(trains_data)
    manual_logs = run_simulation(manual_schedule)
    manual_cost = calculate_cost(manual_schedule)
    
    # 2. Optimized (CP-SAT)
    opt_schedule = solve_dispatch(trains_data)
    if not opt_schedule:
        raise HTTPException(status_code=400, detail="Could not find an optimal schedule")
        
    opt_logs = run_simulation(opt_schedule)
    opt_cost = calculate_cost(opt_schedule)
    
    return {
        "manual": {
            "schedule": manual_schedule,
            "logs": manual_logs,
            "cost": manual_cost
        },
        "optimized": {
            "schedule": opt_schedule,
            "logs": opt_logs,
            "cost": opt_cost
        }
    }
