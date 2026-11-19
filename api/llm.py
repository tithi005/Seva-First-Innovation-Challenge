"""Model plumbing: system prompt, NVIDIA client, and the tool-calling loop."""
import json
import os
import re

from openai import OpenAI

from api import rail_data
from api.tools import TOOLS, dispatch

NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
NVIDIA_MODEL = os.environ.get("NVIDIA_MODEL", "nvidia/nemotron-3.5-super-vl-120b-a12b")
NVIDIA_TIMEOUT = float(os.environ.get("NVIDIA_TIMEOUT", "30"))
MAX_TOOL_STEPS = 3


def _dataset_block() -> str:
    sections = "\n".join(
        f"- {sid}: {rate}% delayed, avg {avg} min, {late} min when late"
        for sid, (rate, avg, late) in rail_data.SECTIONS.items()
    )
    types = "\n".join(
        f"- {name} (priority {info['priority']}): {info['delay_rate']}% delayed, "
        f"avg {info['avg_delay']} min, {info['avg_late']} min when late, {info['journeys']} journeys"
        for name, info in rail_data.TRAIN_TYPES.items()
    )
    weather = "\n".join(
        f"- {info['label']} (flag {flag}): {info['delay_rate']}% delayed, avg {info['avg_delay']} min, "
        f"{info['records']} records"
        for flag, info in rail_data.WEATHER.items()
    )
    seasons = "\n".join(
        f"- {name}: {info['delay_rate']}% delayed, avg {info['avg_delay']} min"
        for name, info in rail_data.SEASONS.items()
    )
    buckets = "\n".join(
        f"- {name}: {info['delay_rate']}% delayed, avg {info['avg_delay']} min"
        for name, info in rail_data.TIME_BUCKETS.items()
    )
    importance = ", ".join(f"{name} {pct}%" for name, pct in rail_data.FEATURE_IMPORTANCE)
    overall = rail_data.OVERALL

    return f"""DATASET FACTS (50,000 journeys, Howrah–Burdwan line)
Overall: {overall['delay_rate']}% delayed, mean {overall['avg_delay']} min, {overall['avg_when_late']} min when late.
Delay threshold: {rail_data.DELAY_THRESHOLD_MIN} minutes (a train counts as late at or above this).

Sections (in order): HWH-BLY, BLY-BDC, BDC-SHE, SHE-SKG, SKG-MMR, MMR-BWN, BWN-GUS, GUS-PAN
{sections}

Train types:
{types}

Weather:
{weather}

Seasons:
{seasons}

Time of day:
{buckets}

Models: classifier accuracy 87.17%; regressor R2 0.878, MAE 1.59 min.
Feature importance: {importance}."""


SYSTEM_PROMPT = f"""You are AMOGH AI, the Station Master for the Howrah–Burdwan line control room.

HOW TO ANSWER
1. Anything about right now comes from the LIVE SNAPSHOT below. Quote its numbers exactly.
2. Historical rates and averages come from DATASET FACTS. Quote them exactly.
3. For any what-if or prediction question call predict_delay. Never estimate a predicted delay yourself.
4. For a specific train number or name, or "which trains are late", call query_live_trains.
5. For a section's historical performance call get_section_stats.
6. Never invent train numbers, section ids, delays or percentages. If the data cannot answer, say what is missing and give the closest fact you do have.
7. Do arithmetic from the numbers you were given rather than from memory.
8. If a train number the user mentions is not in the live roster, say so plainly.
9. Stay in domain: if the question is unrelated to this corridor or railway operations, say in one line that you only cover this line and offer a question you can answer.

STYLE
- Plain text only. No markdown: no asterisks, no headings, no backticks, no bullet glyphs.
- Lead with the answer, then at most one supporting number.
- 90 words maximum, or 200 only when the user asks for a detailed analysis.
- Be operational: name the section or train and the expected minutes saved.

{_dataset_block()}"""


def _client() -> OpenAI:
    api_key = os.environ.get("NVIDIA_API_KEY")
    if not api_key or api_key == "your_nvidia_api_key_here":
        raise RuntimeError("NVIDIA_API_KEY is not configured in api/.env")
    return OpenAI(base_url=NVIDIA_BASE_URL, api_key=api_key, timeout=NVIDIA_TIMEOUT)


def _call(messages: list, *, temperature: float, max_tokens: int, tool_choice: str | None):
    kwargs = {
        "model": NVIDIA_MODEL,
        "messages": messages,
        "temperature": temperature,
        "top_p": 0.95,
        "max_tokens": max_tokens,
        "extra_body": {"chat_template_kwargs": {"enable_thinking": False}},
    }
    if tool_choice is not None:
        kwargs["tools"] = TOOLS
        kwargs["tool_choice"] = tool_choice
    return _client().chat.completions.create(**kwargs)


def _strip_markdown(text: str) -> str:
    """The chat surface renders plain text, so remove stray markdown syntax."""
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"(?m)^\s{0,3}#{1,6}\s*", "", text)
    text = text.replace("`", "")
    text = re.sub(r"(?m)^\s*[-*]\s+", "- ", text)
    return text.strip()


def complete(messages: list, *, temperature: float = 0.4, max_tokens: int = 320) -> str:
    """Single-shot completion, no tools."""
    completion = _call(
        messages, temperature=temperature, max_tokens=max_tokens, tool_choice=None
    )
    return _strip_markdown(completion.choices[0].message.content or "")


def chat(history: list, context: dict | None = None) -> tuple[str, list[str]]:
    """Run the station-master loop and return (answer, tools_used)."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT + "\n\n" + rail_data.build_live_digest(context)},
        *history,
    ]
    tools_used: list[str] = []

    for _ in range(MAX_TOOL_STEPS):
        completion = _call(messages, temperature=0.35, max_tokens=600, tool_choice="auto")
        message = completion.choices[0].message
        calls = getattr(message, "tool_calls", None) or []

        if not calls:
            return _strip_markdown(message.content or ""), tools_used

        messages.append(
            {
                "role": "assistant",
                "content": message.content or "",
                "tool_calls": [
                    {
                        "id": call.id,
                        "type": "function",
                        "function": {
                            "name": call.function.name,
                            "arguments": call.function.arguments,
                        },
                    }
                    for call in calls
                ],
            }
        )

        for call in calls:
            try:
                arguments = json.loads(call.function.arguments or "{}")
            except json.JSONDecodeError:
                arguments = {}
            result = dispatch(call.function.name, arguments, context)
            tools_used.append(call.function.name)
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call.id,
                    "content": json.dumps(result, default=str),
                }
            )

    # Out of tool budget: force a grounded answer from what we already collected.
    completion = _call(messages, temperature=0.35, max_tokens=600, tool_choice="none")
    return _strip_markdown(completion.choices[0].message.content or ""), tools_used
