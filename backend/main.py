"""DebtLens backend — FastAPI + SQLite.

Persists debts, the user profile, and monthly progress check-ins, and proxies
statement-PDF text to LocalMind for structured field extraction.

Run:  uvicorn main:app --port 8010 --host 127.0.0.1
"""
from __future__ import annotations

from typing import Any, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import db
from statement_parser import parse_statement

app = FastAPI(title="DebtLens API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    # Any *.vercel.app frontend and any ngrok-free tunnel.
    allow_origin_regex=r"https://([a-z0-9-]+\.)*(vercel\.app|ngrok-free\.(app|dev))",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def skip_ngrok_warning(request, call_next):
    response = await call_next(request)
    response.headers["ngrok-skip-browser-warning"] = "true"
    return response


@app.on_event("startup")
def _startup() -> None:
    db.init_db()


# ------------------------------------------------------------- Models
class Debt(BaseModel):
    id: str
    name: str
    type: str
    balance: float
    apr: float
    minimumPayment: float
    originalBalance: Optional[float] = None


class Profile(BaseModel):
    hourlyIncome: Optional[float] = None
    monthlyIncome: Optional[float] = None


class ProgressEntry(BaseModel):
    id: str
    date: str
    balances: dict[str, float]
    totalBalance: float


class ParseRequest(BaseModel):
    text: str


# ------------------------------------------------------------- Routes
@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "service": "debtlens"}


@app.get("/debts", response_model=list[Debt])
def get_debts() -> list[dict]:
    return db.kv_get("debts", [])


@app.put("/debts", response_model=list[Debt])
def put_debts(debts: list[Debt]) -> list[dict]:
    data = [d.model_dump() for d in debts]
    db.kv_set("debts", data)
    return data


@app.get("/profile", response_model=Profile)
def get_profile() -> dict:
    return db.kv_get("profile", {})


@app.put("/profile", response_model=Profile)
def put_profile(profile: Profile) -> dict:
    data = profile.model_dump()
    db.kv_set("profile", data)
    return data


@app.get("/progress", response_model=list[ProgressEntry])
def get_progress() -> list[dict]:
    return db.progress_all()


@app.post("/progress", response_model=list[ProgressEntry])
def add_progress(entry: ProgressEntry) -> list[dict]:
    db.progress_add(entry.model_dump())
    return db.progress_all()


@app.post("/parse-statement")
async def parse_statement_route(req: ParseRequest) -> dict[str, Any]:
    return await parse_statement(req.text)
