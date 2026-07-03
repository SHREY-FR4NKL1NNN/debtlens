"""SQLite persistence for DebtLens.

Single-user local app: debts and the user profile are stored as JSON blobs in a
key/value table; monthly progress check-ins get their own row-per-entry table.
"""
from __future__ import annotations

import json
import os
import sqlite3
import threading
from typing import Any

DB_PATH = os.environ.get("DEBTLENS_DB", os.path.join(os.path.dirname(__file__), "debtlens.db"))
_lock = threading.Lock()


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _lock, _connect() as conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)"
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS progress (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                total_balance REAL NOT NULL,
                balances TEXT NOT NULL
            )
            """
        )


# ---- key/value (debts, profile) --------------------------------------
def kv_get(key: str, default: Any) -> Any:
    with _lock, _connect() as conn:
        row = conn.execute("SELECT value FROM kv WHERE key = ?", (key,)).fetchone()
    if row is None:
        return default
    try:
        return json.loads(row["value"])
    except json.JSONDecodeError:
        return default


def kv_set(key: str, value: Any) -> None:
    payload = json.dumps(value)
    with _lock, _connect() as conn:
        conn.execute(
            "INSERT INTO kv (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, payload),
        )


# ---- progress entries -------------------------------------------------
def progress_all() -> list[dict]:
    with _lock, _connect() as conn:
        rows = conn.execute(
            "SELECT id, date, total_balance, balances FROM progress ORDER BY date ASC"
        ).fetchall()
    return [
        {
            "id": r["id"],
            "date": r["date"],
            "totalBalance": r["total_balance"],
            "balances": json.loads(r["balances"]),
        }
        for r in rows
    ]


def progress_add(entry: dict) -> None:
    with _lock, _connect() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO progress (id, date, total_balance, balances) "
            "VALUES (?, ?, ?, ?)",
            (
                entry["id"],
                entry["date"],
                float(entry["totalBalance"]),
                json.dumps(entry["balances"]),
            ),
        )
