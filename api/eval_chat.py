"""Accuracy harness for the station-master assistant.

Runs a fixed set of questions through the real model + tools and scores the
answers against known dataset facts. Usage (from the project root):

    python -m api.eval_chat
    python -m api.eval_chat --verbose
"""
import re
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from api import llm  # noqa: E402  (needs env loaded first)

# Deterministic stand-in for the dashboard snapshot: 5 trains, 2 past 10 min.
CONTEXT = {
    "trains": [
        {"trainNo": "12627", "name": "Karnataka Express", "trainType": "Express",
         "sectionId": "SHE-SKG", "status": "DELAYED", "delayMinutes": 24.3,
         "scheduledTime": "17:30:00", "platform": "P3", "speed": 92},
        {"trainNo": "FR220", "name": "Freight Train", "trainType": "Freight",
         "sectionId": "HWH-BLY", "status": "DELAYED", "delayMinutes": 12.0,
         "scheduledTime": "08:57:00", "platform": "P1", "speed": 88},
        {"trainNo": "12884", "name": "Suburban Local", "trainType": "Suburban",
         "sectionId": "BWN-GUS", "status": "APPROACHING", "delayMinutes": 4.0,
         "scheduledTime": "18:10:00", "platform": "P2", "speed": 105},
        {"trainNo": "12040", "name": "Express Train", "trainType": "Express",
         "sectionId": "GUS-PAN", "status": "APPROACHING", "delayMinutes": 7.5,
         "scheduledTime": "08:51:00", "platform": "P2", "speed": 110},
        {"trainNo": "PA405", "name": "Passenger Train", "trainType": "Passenger",
         "sectionId": "MMR-BWN", "status": "APPROACHING", "delayMinutes": 0,
         "scheduledTime": "09:05:00", "platform": "P4", "speed": 75},
    ],
    "alerts": [
        {"severity": "critical", "message": "FREIGHT SIDING at 91% capacity threshold",
         "location": "SHE-SKG", "timestamp": "17:33:10"},
    ],
    "recommendations": [
        {"type": "REROUTE", "title": "Express via BWN-GUS reroute B", "savings": "13 min"},
    ],
    "simulation": {"progressPercent": 72, "conflictsResolved": 14,
                   "efficiencyGain": "+18.6%", "isRunning": True},
}

# must: every substring must appear. any: at least one. tool: required tool call.
# regex: pattern that must match.
CASES = [
    {"q": "Which section has the highest delay rate?",
     "must": ["SHE-SKG", "56.6"]},
    {"q": "What is the classifier accuracy?",
     "must": ["87.17"]},
    {"q": "How bad are delays in severe weather?",
     "any": ["20.73", "99.7"]},
    {"q": "Which train type is delayed most often?",
     "must": ["Freight"], "any": ["81.7"]},
    {"q": "How many trains are running late right now, above the 10 minute threshold?",
     "any": ["2 ", "two"]},
    {"q": "What is the average delay across the whole dataset?",
     "must": ["10.47"]},
    {"q": "Predict the delay for an express train on SHE-SKG in clear weather with no upstream delay.",
     "tool": "predict_delay", "regex": r"\d+(\.\d+)?\s*(min|minute)"},
    {"q": "Which train is the most delayed right now?",
     "must": ["12627"]},
    {"q": "What is the worst season for delays?",
     "must": ["Monsoon"]},
    {"q": "What delay threshold does the model use?",
     "must": ["10"]},
    {"q": "How many journeys are in the training data?",
     "any": ["50,000", "50000", "50 000"]},
    {"q": "Should we hold the 12627 so the 12040 can pass?",
     "must": ["12627"], "tool": "query_live_trains"},
    {"q": "What is the delay on train 99999 right now?",
     "any": ["not in", "no train", "isn't", "is not", "cannot find", "no record", "unknown", "not tracked", "don't have"]},
    {"q": "Which section is the least delayed?",
     "must": ["HWH-BLY"]},
    {"q": "What is the capital of France?",
     "any": ["rail", "corridor", "scope", "outside", "only"]},
]


def score(case: dict, answer: str, tools: list[str]) -> tuple[bool, str]:
    text = answer.lower()

    if "tool" in case and case["tool"] not in tools:
        return False, f"tool {case['tool']} not used"
    if "regex" in case and not re.search(case["regex"], text):
        return False, f"no match for /{case['regex']}/"
    for needle in case.get("must", []):
        if needle.lower() not in text:
            return False, f"missing '{needle}'"
    options = case.get("any")
    if options and not any(opt.lower() in text for opt in options):
        return False, f"missing any of {options}"
    return True, "ok"


def main() -> int:
    verbose = "--verbose" in sys.argv
    passed = 0
    total_ms = 0
    print(f"model: {llm.NVIDIA_MODEL}\ncases: {len(CASES)}\n")

    for index, case in enumerate(CASES, 1):
        started = time.perf_counter()
        try:
            answer, tools = llm.chat(
                [{"role": "user", "content": case["q"]}], CONTEXT
            )
        except Exception as exc:  # noqa: BLE001
            print(f"{index:02d} FAIL  {case['q']}\n     error: {exc}")
            continue
        elapsed = int((time.perf_counter() - started) * 1000)
        total_ms += elapsed

        ok, reason = score(case, answer, tools)
        passed += ok
        flag = "PASS" if ok else "FAIL"
        print(f"{index:02d} {flag}  {elapsed:5d} ms  {case['q']}")
        if not ok or verbose:
            print(f"     reason: {reason}")
            print(f"     tools : {', '.join(tools) or 'none'}")
            print(f"     answer: {answer.replace(chr(10), ' ')[:300]}")

    print(f"\nscore: {passed}/{len(CASES)} ({round(passed / len(CASES) * 100)}%)")
    if passed:
        print(f"mean latency: {round(total_ms / passed)} ms")
    return 0 if passed == len(CASES) else 1


if __name__ == "__main__":
    raise SystemExit(main())
