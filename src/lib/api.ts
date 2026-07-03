// DebtLens backend client — FastAPI + SQLite.
// Persists debts, the user profile, and monthly progress entries, and proxies
// statement-PDF text to LocalMind for structured field extraction.

import type { Debt, ProgressEntry, UserProfile } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8010';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${detail || path}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---- Debts -------------------------------------------------------------
export const getDebts = () => request<Debt[]>('/debts');

export const saveDebts = (debts: Debt[]) =>
  request<Debt[]>('/debts', {
    method: 'PUT',
    body: JSON.stringify(debts),
  });

// ---- Profile (income for the Life Cost view) --------------------------
export const getProfile = () => request<UserProfile>('/profile');

export const saveProfile = (profile: UserProfile) =>
  request<UserProfile>('/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  });

// ---- Progress tracking -------------------------------------------------
export const getProgress = () => request<ProgressEntry[]>('/progress');

export const addProgress = (entry: ProgressEntry) =>
  request<ProgressEntry[]>('/progress', {
    method: 'POST',
    body: JSON.stringify(entry),
  });

// ---- Statement parsing (PDF text -> structured fields via LocalMind) ---
export interface ParsedStatement {
  name: string | null;
  type: string | null;
  balance: number | null;
  apr: number | null;
  minimumPayment: number | null;
  confidence: 'high' | 'low';
}

export const parseStatement = (text: string) =>
  request<ParsedStatement>('/parse-statement', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });

export async function backendHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
