"""Statement parsing: ask LocalMind to pull structured fields out of the raw
PDF text, with a regex fallback so the feature degrades gracefully when
LocalMind is unavailable or returns something unparseable.
"""
from __future__ import annotations

import json
import os
import re
from typing import Optional

import httpx

LOCALMIND_URL = os.environ.get("LOCALMIND_URL", "http://127.0.0.1:8000")

_PROMPT = (
    "You are a precise data extractor. From the following credit-card statement "
    "text, extract three numbers: the current statement balance, the APR (annual "
    "interest rate as a percentage), and the minimum payment due. Respond with "
    "ONLY a JSON object and nothing else, in exactly this form: "
    '{{"balance": number or null, "apr": number or null, "minimum_payment": number or null}}. '
    "Use null for anything you cannot find. Statement text:\n\n{text}"
)


def _num(x) -> Optional[float]:
    if x is None:
        return None
    try:
        return round(float(x), 2)
    except (TypeError, ValueError):
        return None


def _extract_json(text: str) -> Optional[dict]:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def _regex_fallback(text: str) -> dict:
    """Best-effort heuristic extraction from statement text."""

    def money(pattern: str) -> Optional[float]:
        m = re.search(pattern, text, re.IGNORECASE)
        if not m:
            return None
        return _num(m.group(1).replace(",", ""))

    balance = money(r"(?:new balance|statement balance|current balance)[^\d\-]{0,20}\$?\s*([\d,]+\.?\d*)")
    minimum = money(r"(?:minimum payment(?: due)?|minimum amount due)[^\d\-]{0,20}\$?\s*([\d,]+\.?\d*)")
    apr_m = re.search(r"([\d]+\.?\d*)\s*%\s*(?:apr|annual percentage rate)", text, re.IGNORECASE)
    if not apr_m:
        apr_m = re.search(r"(?:apr|annual percentage rate)[^\d]{0,20}([\d]+\.?\d*)\s*%?", text, re.IGNORECASE)
    apr = _num(apr_m.group(1)) if apr_m else None

    return {"balance": balance, "apr": apr, "minimum_payment": minimum}


async def parse_statement(text: str) -> dict:
    """Return {name, type, balance, apr, minimumPayment, confidence}."""
    ai: Optional[dict] = None
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{LOCALMIND_URL}/query",
                json={"query": _PROMPT.format(text=text[:6000])},
                headers={"ngrok-skip-browser-warning": "true"},
            )
            resp.raise_for_status()
            answer = resp.json().get("response", "")
            ai = _extract_json(answer)
    except Exception:
        ai = None

    fallback = _regex_fallback(text)

    def pick(key: str):
        if ai and ai.get(key) is not None:
            return _num(ai.get(key))
        return fallback.get(key)

    balance = pick("balance")
    apr = pick("apr")
    minimum = pick("minimum_payment")

    high = ai is not None and all(
        ai.get(k) is not None for k in ("balance", "apr", "minimum_payment")
    )

    return {
        "name": None,
        "type": "credit",  # statements are credit-card PDFs
        "balance": balance,
        "apr": apr,
        "minimumPayment": minimum,
        "confidence": "high" if high else "low",
    }
