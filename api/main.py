"""
Amogh Rail — ML Inference API
Run: uvicorn api.main:app --reload --port 8000   (from the project root)
"""
from pathlib import Path
import json
import os
from typing import Any, List

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Load env vars
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from api import llm
from api.models import FEATURE_ORDER, predict_delay, warmup


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        warmup()  # load the delay pipelines before the first request
    except Exception as exc:  # pragma: no cover - non-fatal
        print(f"Model warmup failed: {exc}")
    yield


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Amogh Rail ML API",
    description="Two-stage delay prediction: RandomForest classifier + HistGradientBoosting regressor",
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_eval_cache_path = Path(__file__).parent / "eval_cache.json"
eval_cache = json.loads(_eval_cache_path.read_text()) if _eval_cache_path.exists() else None

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
    # Live dashboard snapshot — trains/alerts/recommendations/simulation.
    context: dict[str, Any] | None = None

MAX_HISTORY = 12


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "Amogh Rail ML API", "version": "1.1.0"}

@app.get("/health", tags=["Health"])
def health():
    """Alias for uptime checks — the dashboard polls this."""
    return {"status": "ok", "service": "Amogh Rail ML API", "version": "1.1.0"}

@app.post("/predict", response_model=PredictResponse, tags=["Inference"])
def predict(req: PredictRequest):
    try:
        result = predict_delay(req.model_dump())
        return PredictResponse(
            is_delayed          = result["is_delayed"],
            confidence          = result["confidence_pct"],
            delay_probability   = result["delay_probability_pct"],
            predicted_delay_min = result["predicted_delay_min"],
            threshold_min       = result["threshold_min"],
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
            "delay_threshold_min": 10,
            "n_features":        len(FEATURE_ORDER),
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
    fallback = (
        "I noticed the HWH-BLY section is heavily congested. I recommend holding the Freight train "
        "to let the Express pass. The optimized schedule successfully avoided "
        + str(req.fifo_wait - req.opt_wait)
        + " minutes of delay across the network, keeping the bottleneck clear in "
        + str(req.opt_makespan)
        + " minutes."
    )

    prompt = f"""
Dispatch run complete. Report the result to the station controllers:
- Manual FIFO total wait: {req.fifo_wait} min
- Optimized total wait: {req.opt_wait} min (saved {req.fifo_wait - req.opt_wait} min)
- Manual bottleneck clearance: {req.fifo_makespan} min
- Optimized bottleneck clearance: {req.opt_makespan} min

Write 2-3 sentences, plain text, no markdown. Lead with the minutes saved and name the action the controller should take.
"""

    try:
        return {
            "insights": llm.complete(
                [{"role": "user", "content": prompt}], temperature=0.4, max_tokens=220
            ) or fallback
        }
    except Exception as e:
        print(f"Error calling NVIDIA API: {e}")
        return {"insights": fallback}


@app.post("/chat", tags=["AI"])
def chat(req: ChatRequest):
    history = [
        {"role": m.role, "content": m.content}
        for m in req.messages
        if m.role in ("user", "assistant") and m.content.strip()
    ][-MAX_HISTORY:]

    if not history:
        raise HTTPException(status_code=400, detail="No user message supplied.")

    try:
        reply, tools_used = llm.chat(history, req.context)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        print(f"Chat error: {exc}")
        raise HTTPException(status_code=502, detail=f"LLM request failed: {exc}")

    return {
        "response": reply or "No response received.",
        "model": llm.NVIDIA_MODEL,
        "tools_used": tools_used,
    }
