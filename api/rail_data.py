"""Curated facts about the Howrah–Burdwan corridor, derived from the 50k-record
dataset, plus a compact digest of the live snapshot the dashboard sends up.
"""
from datetime import datetime, timezone, timedelta

DELAY_THRESHOLD_MIN = 10

# section -> (delay_rate_pct, avg_delay_min, avg_when_late_min)
SECTIONS: dict[str, tuple[float, float, float]] = {
    "HWH-BLY": (38.6, 9.23, 14.92),
    "BLY-BDC": (38.9, 9.17, 14.80),
    "BDC-SHE": (38.7, 9.29, 15.01),
    "SHE-SKG": (56.6, 11.69, 15.47),
    "SKG-MMR": (50.6, 11.09, 15.51),
    "MMR-BWN": (50.8, 11.10, 15.41),
    "BWN-GUS": (52.0, 11.18, 15.45),
    "GUS-PAN": (51.7, 11.03, 15.31),
}

TRAIN_TYPES: dict[str, dict] = {
    "Express": {"priority": 1, "delay_rate": 28.9, "avg_delay": 8.06, "avg_late": 14.62, "journeys": 14094},
    "Passenger": {"priority": 2, "delay_rate": 46.3, "avg_delay": 10.42, "avg_late": 14.88, "journeys": 14919},
    "Suburban": {"priority": 2, "delay_rate": 45.2, "avg_delay": 10.33, "avg_late": 14.98, "journeys": 12442},
    "Freight": {"priority": 3, "delay_rate": 81.7, "avg_delay": 14.73, "avg_late": 16.25, "journeys": 8545},
}

WEATHER: dict[int, dict] = {
    0: {"label": "Clear", "delay_rate": 32.5, "avg_delay": 8.34, "records": 37396},
    1: {"label": "Moderate rain", "delay_rate": 85.4, "avg_delay": 14.37, "records": 7872},
    2: {"label": "Severe weather", "delay_rate": 99.7, "avg_delay": 20.73, "records": 4732},
}

SEASONS: dict[str, dict] = {
    "Winter": {"delay_rate": 55.8, "avg_delay": 12.39},
    "Monsoon": {"delay_rate": 56.1, "avg_delay": 11.18},
    "Spring": {"delay_rate": 41.2, "avg_delay": 9.46},
    "Summer": {"delay_rate": 37.7, "avg_delay": 9.07},
}

TIME_BUCKETS: dict[str, dict] = {
    "Peak": {"delay_rate": 53.6, "avg_delay": 11.31},
    "Off-peak": {"delay_rate": 40.8, "avg_delay": 9.55},
    "Night": {"delay_rate": 40.6, "avg_delay": 9.80},
}

FEATURE_IMPORTANCE = [
    ("weather_flag", 31.80),
    ("upstream_delay_min", 24.47),
    ("section_congestion_level", 15.65),
    ("train_type", 6.50),
    ("priority", 5.28),
    ("season", 3.68),
    ("day_of_week", 3.53),
    ("section_id", 3.20),
    ("track_type", 2.69),
    ("time_of_day_bucket", 2.46),
    ("is_weekend", 0.74),
]

OVERALL = {
    "records": 50000,
    "delay_rate": 47.2,
    "avg_delay": 10.47,
    "avg_when_late": 15.27,
}

# Free-text aliasing so the model can say "she skg" or "Seoraphuli" and still hit.
_SECTION_ALIASES = {
    "HWH": "HWH-BLY", "HOWRAH": "HWH-BLY", "BLY": "BLY-BDC",
    "BDC": "BDC-SHE", "SHE": "BDC-SHE", "SEORAPHULI": "BDC-SHE",
    "SKG": "SKG-MMR", "MMR": "MMR-BWN", "BWN": "BWN-GUS",
    "BURDWAN": "BWN-GUS", "GUS": "GUS-PAN", "PAN": "GUS-PAN",
}


def resolve_section(raw: str | None) -> str | None:
    """Normalise a section reference to its canonical 'AAA-BBB' id."""
    if not raw:
        return None
    key = str(raw).upper().replace("–", "-").replace("—", "-").strip()
    key = key.replace(" TO ", "-").replace(" ", "-").replace("_", "-")
    key = "-".join(part for part in key.split("-") if part)

    if key in SECTIONS:
        return key
    # Accept reversed order: "SKG-SHE"
    parts = key.split("-")
    for index in range(len(parts) - 1):
        candidate = f"{parts[index]}-{parts[index + 1]}"
        if candidate in SECTIONS:
            return candidate
        reversed_candidate = f"{parts[index + 1]}-{parts[index]}"
        if reversed_candidate in SECTIONS:
            return reversed_candidate
    for part in parts:
        if part in _SECTION_ALIASES:
            return _SECTION_ALIASES[part]
    return None


def section_facts(section_id: str) -> dict:
    rate, avg, avg_late = SECTIONS[section_id]
    return {
        "section": section_id,
        "delay_rate_pct": rate,
        "avg_delay_min": avg,
        "avg_delay_when_late_min": avg_late,
        "status": "WORST BOTTLENECK" if rate == max(v[0] for v in SECTIONS.values())
        else ("HIGH" if rate >= 50 else "NORMAL"),
    }


def _ist_now() -> str:
    return datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%H:%M:%S IST")


def _train_is_late(train: dict) -> bool:
    return float(train.get("delayMinutes") or 0) >= DELAY_THRESHOLD_MIN


def build_live_digest(context: dict | None) -> str:
    """Turn the dashboard snapshot into a short factual block for the prompt."""
    if not context or not context.get("trains"):
        return "LIVE SNAPSHOT: no telemetry supplied for this request. Answer from dataset facts only and say so if a live figure is requested."

    trains = context.get("trains") or []
    alerts = context.get("alerts") or []
    recs = context.get("recommendations") or []
    simulation = context.get("simulation") or {}

    late = [t for t in trains if _train_is_late(t)]
    lines = [
        f"LIVE SNAPSHOT ({_ist_now()}) — authoritative for 'now' questions.",
        f"Trains tracked: {len(trains)}; late (>={DELAY_THRESHOLD_MIN} min): {len(late)}; "
        f"on-time rate: {round((len(trains) - len(late)) / max(1, len(trains)) * 100)}%.",
    ]

    per_section = []
    for section_id in SECTIONS:
        on_section = [t for t in trains if resolve_section(t.get("sectionId")) == section_id]
        if on_section:
            per_section.append(
                f"{section_id} {len(on_section)}trn/{sum(1 for t in on_section if _train_is_late(t))}late"
            )
    if per_section:
        lines.append("Per section: " + " · ".join(per_section))

    worst_trains = sorted(late, key=lambda t: float(t.get("delayMinutes") or 0), reverse=True)[:5]
    if worst_trains:
        lines.append(
            "Most delayed now: "
            + " · ".join(
                f"{t.get('trainNo')} +{round(float(t.get('delayMinutes') or 0), 1)}min "
                f"({t.get('sectionId') or t.get('location')}, {t.get('trainType') or 'train'})"
                for t in worst_trains
            )
        )

    if alerts:
        open_alerts = [a for a in alerts if a.get("severity") in ("critical", "warning")]
        lines.append(
            f"Open alerts: {len(open_alerts)}. "
            + " | ".join(
                f"[{a.get('severity')}] {a.get('message')} @ {a.get('location')}"
                for a in open_alerts[:3]
            )
        )

    if recs:
        lines.append(
            "Pending AI actions: "
            + " | ".join(
                f"{r.get('type')}: {r.get('title')}"
                + (f" (saves {r.get('savings')})" if r.get("savings") else "")
                for r in recs[:3]
            )
        )

    if simulation:
        lines.append(
            f"Simulation: {simulation.get('progressPercent', 0)}% complete, "
            f"{simulation.get('conflictsResolved', 0)} conflicts resolved, "
            f"{simulation.get('efficiencyGain', '+0%')} efficiency vs FIFO."
        )

    return "\n".join(lines)


def query_live_trains(
    context: dict | None,
    section_id: str | None = None,
    train_type: str | None = None,
    only_late: bool = False,
    query: str | None = None,
    limit: int = 8,
) -> dict:
    """Filter the live roster for train-specific questions."""
    trains = (context or {}).get("trains") or []
    if not trains:
        return {"error": "No live telemetry available for this request."}

    wanted_section = resolve_section(section_id) if section_id else None
    if section_id and not wanted_section:
        return {"error": f"Unknown section '{section_id}'.", "valid_sections": list(SECTIONS)}

    needle = str(query).lower() if query else None
    matches = []
    for train in trains:
        if wanted_section and resolve_section(train.get("sectionId")) != wanted_section:
            continue
        if train_type and str(train.get("trainType", "")).lower() != train_type.lower():
            continue
        if only_late and not _train_is_late(train):
            continue
        if needle:
            haystack = f"{train.get('trainNo','')} {train.get('name','')} {train.get('destination','')}".lower()
            if needle not in haystack:
                continue
        matches.append(train)

    matches.sort(key=lambda t: float(t.get("delayMinutes") or 0), reverse=True)
    return {
        "count": len(matches),
        "late_count": sum(1 for t in matches if _train_is_late(t)),
        "trains": [
            {
                "train_no": t.get("trainNo"),
                "name": t.get("name"),
                "type": t.get("trainType"),
                "section": t.get("sectionId") or t.get("location"),
                "status": t.get("status"),
                "delay_min": round(float(t.get("delayMinutes") or 0), 1),
                "is_late": _train_is_late(t),
                "scheduled": t.get("scheduledTime"),
                "platform": t.get("platform"),
                "speed_kmh": t.get("speed"),
            }
            for t in matches[: max(1, min(int(limit), 20))]
        ],
    }
