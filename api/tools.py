"""Function-calling tools exposed to the station-master model."""
import json
from datetime import datetime, timezone, timedelta

from api import rail_data
from api.models import predict_delay as run_model

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "predict_delay",
            "description": (
                "Run the trained two-stage ML pipeline (RandomForest classifier + "
                "HistGradientBoosting regressor) for one train on one section. Use this for "
                "every what-if question ('what happens if...', 'how late will...', 'predict delay for...') "
                "instead of estimating. Returns delay probability and predicted minutes."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "train_type": {
                        "type": "string",
                        "enum": ["Express", "Passenger", "Suburban", "Freight"],
                    },
                    "section_id": {
                        "type": "string",
                        "description": "One of HWH-BLY, BLY-BDC, BDC-SHE, SHE-SKG, SKG-MMR, MMR-BWN, BWN-GUS, GUS-PAN.",
                    },
                    "weather_flag": {
                        "type": "integer",
                        "enum": [0, 1, 2],
                        "description": "0 clear, 1 moderate rain, 2 severe weather. Default 0.",
                    },
                    "upstream_delay_min": {
                        "type": "number",
                        "description": "Delay inherited from the previous section, in minutes. Default 0.",
                    },
                    "season": {
                        "type": "string",
                        "enum": ["Summer", "Spring", "Monsoon", "Winter"],
                        "description": "Optional. Defaults to the current season.",
                    },
                    "time_of_day_bucket": {
                        "type": "string",
                        "enum": ["Peak", "Off-peak", "Night"],
                        "description": "Optional. Defaults to Peak.",
                    },
                    "section_congestion_level": {
                        "type": "number",
                        "description": "0.0 to 1.0. Default 0.75.",
                    },
                },
                "required": ["train_type", "section_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "query_live_trains",
            "description": (
                "Look up the live roster. Use for questions about a specific train number or name, "
                "'which trains are late', 'what is running in section X', or counting trains now."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Train number or partial name, e.g. '12627'."},
                    "section_id": {"type": "string", "description": "Filter by corridor section id."},
                    "train_type": {
                        "type": "string",
                        "enum": ["Express", "Passenger", "Suburban", "Freight"],
                    },
                    "only_late": {"type": "boolean", "description": "Only trains past the 10 minute threshold."},
                    "limit": {"type": "integer", "description": "Max rows to return (default 8)."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_section_stats",
            "description": (
                "Historical dataset statistics for one corridor section: delay rate, average delay, "
                "average delay when late, and bottleneck status."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "section_id": {"type": "string", "description": "Section id or station code."}
                },
                "required": ["section_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "network_overview",
            "description": "Refresh the live corridor snapshot: counts, per-section load, worst delays, alerts, pending AI actions.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]

_IST = timezone(timedelta(hours=5, minutes=30))


def _current_season() -> str:
    month = datetime.now(_IST).month
    if month in (11, 12, 1, 2):
        return "Winter"
    if month in (3, 4):
        return "Spring"
    if month in (5, 6):
        return "Summer"
    return "Monsoon"


def _defaults() -> dict:
    today = datetime.now(_IST)
    return {
        "season": _current_season(),
        "time_of_day_bucket": "Peak",
        "section_congestion_level": 0.75,
        "day_of_week": today.isoweekday(),
        "is_weekend": 1 if today.isoweekday() >= 6 else 0,
        "track_type": "Double",
    }


def _predict(args: dict) -> dict:
    section = rail_data.resolve_section(args.get("section_id"))
    if not section:
        return {"error": f"Unknown section '{args.get('section_id')}'.", "valid_sections": list(rail_data.SECTIONS)}

    train_type = args.get("train_type") or "Freight"
    if train_type not in rail_data.TRAIN_TYPES:
        return {"error": f"Unknown train_type '{train_type}'.", "valid_types": list(rail_data.TRAIN_TYPES)}

    defaults = _defaults()
    features = {
        "train_type": train_type,
        "priority": rail_data.TRAIN_TYPES[train_type]["priority"],
        "section_id": section,
        "day_of_week": args.get("day_of_week") or defaults["day_of_week"],
        "is_weekend": defaults["is_weekend"],
        "time_of_day_bucket": args.get("time_of_day_bucket") or defaults["time_of_day_bucket"],
        "season": args.get("season") or defaults["season"],
        "upstream_delay_min": float(args.get("upstream_delay_min") or 0),
        "section_congestion_level": float(
            args.get("section_congestion_level", defaults["section_congestion_level"])
        ),
        "weather_flag": int(args.get("weather_flag") or 0),
        "track_type": args.get("track_type") or defaults["track_type"],
    }
    result = run_model(features)
    result["inputs"] = {
        "train_type": train_type,
        "section_id": section,
        "weather": rail_data.WEATHER[features["weather_flag"]]["label"],
        "upstream_delay_min": features["upstream_delay_min"],
        "season": features["season"],
        "time_of_day_bucket": features["time_of_day_bucket"],
    }
    return result


def dispatch(name: str, args: dict, context: dict | None) -> dict:
    """Execute one tool call, never raising — errors go back to the model."""
    try:
        if name == "predict_delay":
            return _predict(args)
        if name == "query_live_trains":
            return rail_data.query_live_trains(
                context,
                section_id=args.get("section_id"),
                train_type=args.get("train_type"),
                only_late=bool(args.get("only_late")),
                query=args.get("query"),
                limit=args.get("limit") or 8,
            )
        if name == "get_section_stats":
            section = rail_data.resolve_section(args.get("section_id"))
            if not section:
                return {
                    "error": f"Unknown section '{args.get('section_id')}'.",
                    "valid_sections": list(rail_data.SECTIONS),
                }
            return rail_data.section_facts(section)
        if name == "network_overview":
            return {"snapshot": rail_data.build_live_digest(context)}
        return {"error": f"Unknown tool '{name}'."}
    except Exception as exc:  # pragma: no cover - defensive
        return {"error": f"{type(exc).__name__}: {exc}"}
