"""
Amogh Rail — ML Inference API
Run: uvicorn api.main:app --reload --port 8000
"""
from pathlib import Path
import json

import joblib
import pandas as pd
import os
from openai import OpenAI
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Load env vars
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

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

class InsightRequest(BaseModel):
    opt_wait: int
    fifo_wait: int
    opt_makespan: int
    fifo_makespan: int
    schedule: list

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

RAILWAY_SYSTEM_PROMPT = """
You are AMOGH AI — the intelligent Station Master for Amogh Rail's Howrah–Burdwan Line Control Room.
You have full situational awareness of the live railway network.
All statistics below are derived from a 50,000-record real-structure dataset of this corridor.

=== ML MODELS ===
- Stage 1: RandomForest Classifier — 87.17% accuracy, predicts IF a train will be delayed (>10 min)
- Stage 2: HistGradientBoosting Regressor — R² = 0.878, MAE = 1.59 min, predicts delay magnitude
- Delay threshold: 10 minutes
- Top delay factors by feature importance:
  1. Weather flag: 31.8% importance
  2. Upstream delay: 24.5% importance
  3. Section congestion level: 15.6% importance
  4. Train type: 6.5% importance
  5. Priority: 5.3% importance

=== NETWORK (HOWRAH → BURDWAN CORRIDOR) ===
8 sections in order: HWH-BLY → BLY-BDC → BDC-SHE → SHE-SKG → SKG-MMR → MMR-BWN → BWN-GUS → GUS-PAN

Section delay rates (from dataset):
- HWH-BLY: 38.6% delayed, avg delay 9.23 min, avg when late: 14.92 min [NORMAL]
- BLY-BDC: 38.9% delayed, avg delay 9.17 min, avg when late: 14.80 min [NORMAL]
- BDC-SHE: 38.7% delayed, avg delay 9.29 min, avg when late: 15.01 min [NORMAL]
- SHE-SKG: 56.6% delayed, avg delay 11.69 min, avg when late: 15.47 min [WORST — BOTTLENECK]
- SKG-MMR: 50.6% delayed, avg delay 11.09 min, avg when late: 15.51 min [HIGH]
- MMR-BWN: 50.8% delayed, avg delay 11.10 min, avg when late: 15.41 min [HIGH]
- BWN-GUS: 52.0% delayed, avg delay 11.18 min, avg when late: 15.45 min [HIGH]
- GUS-PAN: 51.7% delayed, avg delay 11.03 min, avg when late: 15.31 min [HIGH]

=== TRAIN TYPES & PRIORITIES ===
- Express (Priority 1):  28.9% delay rate, avg 8.06 min, avg when late 14.62 min — 14,094 journeys — HIGHEST priority
- Passenger (Priority 2): 46.3% delay rate, avg 10.42 min, avg when late 14.88 min — 14,919 journeys
- Suburban (Priority 2): 45.2% delay rate, avg 10.33 min, avg when late 14.98 min — 12,442 journeys
- Freight (Priority 3):  81.7% delay rate, avg 14.73 min, avg when late 16.25 min — 8,545 journeys — LOWEST priority

=== WEATHER IMPACT (from dataset) ===
- Clear (flag=0): 32.5% delayed, avg 8.34 min — 37,396 records
- Moderate rain (flag=1): 85.4% delayed, avg 14.37 min — 7,872 records
- Severe weather (flag=2): 99.7% delayed, avg 20.73 min — 4,732 records

=== SEASON IMPACT ===
- Winter: 55.8% delayed, avg 12.39 min — WORST season
- Monsoon: 56.1% delayed, avg 11.18 min — WORST season
- Spring: 41.2% delayed, avg 9.46 min
- Summer: 37.7% delayed, avg 9.07 min — BEST season

=== TIME OF DAY ===
- Peak hours: 53.6% delayed, avg 11.31 min
- Off-peak: 40.8% delayed, avg 9.55 min
- Night: 40.6% delayed, avg 9.80 min

=== OVERALL NETWORK STATS ===
- Total dataset: 50,000 journeys on Howrah–Burdwan line
- Overall delay rate: 47.2% (23,584 delayed journeys)
- Overall avg delay: 10.47 min across all trains
- Avg delay when late: 15.27 min

=== OPTIMIZATION SYSTEM ===
- Dispatch solver: Google OR-Tools CP-SAT (constraint programming)
- Simulation engine: SimPy discrete-event simulator
- Priority order: Express (1) > Passenger/Suburban (2) > Freight (3)
- Typical savings vs FIFO: 10–20 minutes cumulative wait in a 12-train cluster

=== YOUR ROLE ===
Answer questions from station controllers and hackathon judges concisely and confidently.
Always cite actual numbers from the dataset above when discussing delays or performance.
If asked for a recommendation, be direct and action-oriented.
Keep responses under 150 words unless a detailed analysis is requested.
Do NOT use markdown formatting — plain text only.
"""


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

@app.post("/generate-insights", tags=["Optimization"])
def generate_insights(req: InsightRequest):
    api_key = os.environ.get("NVIDIA_API_KEY")
    if not api_key or api_key == "your_nvidia_api_key_here":
        # Mock response for hackathon demo if key is not set
        return {
            "insights": "I noticed the HWH-BLY section is heavily congested. I recommend holding the Freight train to let the Express pass. The optimized schedule successfully avoided " + str(req.fifo_wait - req.opt_wait) + " minutes of delay across the network, keeping the bottleneck clear in " + str(req.opt_makespan) + " minutes."
        }

    try:
        client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=api_key
        )
        
        prompt = f"""
You are an expert AI Railway Station Master. I have just run a dispatch optimization algorithm (CP-SAT) against a standard FIFO manual dispatch.
Here are the results:
- Manual Total Wait Time: {req.fifo_wait} mins
- Optimized Total Wait Time: {req.opt_wait} mins (Saved: {req.fifo_wait - req.opt_wait} mins)
- Manual Time to Clear Bottleneck: {req.fifo_makespan} mins
- Optimized Time to Clear Bottleneck: {req.opt_makespan} mins

Write a short, punchy, 2-3 sentence insight for the dashboard. Speak directly to the station controllers. 
Point out the massive delay savings. Be professional but emphasize the 'AI' advantage. Do not use markdown.
"""
        completion = client.chat.completions.create(
            model="meta/llama-3.1-8b-instruct",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            top_p=1,
            max_tokens=1024,
        )
        
        return {"insights": completion.choices[0].message.content.strip()}
    except Exception as e:
        print(f"Error calling NVIDIA API: {e}")
        return {
            "insights": "I noticed the HWH-BLY section is heavily congested. I recommend holding the Freight train to let the Express pass. The optimized schedule successfully avoided " + str(req.fifo_wait - req.opt_wait) + " minutes of delay across the network, keeping the bottleneck clear in " + str(req.opt_makespan) + " minutes."
        }


@app.post("/chat", tags=["AI"])
def chat(req: ChatRequest):
    api_key = os.environ.get("NVIDIA_API_KEY")
    if not api_key:
        return {"response": "NVIDIA API key not configured."}
    try:
        client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=api_key
        )
        messages = [{"role": "system", "content": RAILWAY_SYSTEM_PROMPT}]
        messages += [{"role": m.role, "content": m.content} for m in req.messages]
        completion = client.chat.completions.create(
            model="meta/llama-3.1-8b-instruct",
            messages=messages,
            temperature=0.6,
            top_p=1,
            max_tokens=512,
        )
        return {"response": completion.choices[0].message.content.strip()}
    except Exception as e:
        print(f"Chat error: {e}")
        return {"response": f"Error: {str(e)}"}


