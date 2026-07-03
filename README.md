# DebtLens

**AI-powered debt intelligence.** Not a calculator — a system that understands
your whole debt picture, explains the math behind every recommendation, and
shows the human cost of each decision (months of freedom, interest wasted, hours
of your life).

Premium fintech aesthetic: minimal clinical glass morphism, Playfair for
storytelling / JetBrains Mono for data / Inter for UI, a single green accent that
means "money moving in your favor," numbers that count up, charts that draw in.
Dark mode and a first-class mobile experience.

## Features (7 screens)

1. **Dashboard** — hero total-debt number, per-debt breakdown, payoff date.
2. **Add / Manage Debts** — slide-in drawer with a **PDF statement import**
   (pdf.js extracts text → LocalMind pulls out balance / APR / minimum).
3. **Strategy Comparison** — snowball vs avalanche vs a search-based **optimal**
   plan, a unified balance-over-time chart, and a streaming AI explanation.
4. **Scenario Simulator** — drag the extra-payment slider or add a windfall and
   watch payoff date, interest saved, and the chart update live (150ms debounce).
5. **Financial Calendar** — a Gantt-style timeline of when each debt ends, with
   milestone markers and a tap-to-inspect month detail.
6. **Life Cost View** — interest translated into groceries, flights, trips, and
   **hours of your life** (from your income).
7. **Progress Tracker** — monthly check-ins plotted as actual-vs-projected, with
   an on-track streak counter.

## Stack

- **Frontend** — React + Vite + TypeScript, Framer Motion, Recharts, a
  CSS-variable design system.
- **Backend** — FastAPI + SQLite (debts, profile, progress; statement parsing).
- **AI** — [LocalMind](../localmind) MoE router for streaming explanations and
  statement field extraction.

## Run it

**LocalMind** must be running on `:8000` for AI explanations & PDF parsing
(see `../localmind`). Then:

```bash
# Backend (FastAPI + SQLite) on :8010
cd backend
python -m venv .venv && .venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python -m uvicorn main:app --port 8010 --host 127.0.0.1

# Frontend (Vite) on :5173
npm install
npm run dev
```

Open http://localhost:5173. Config via `.env.local` (see `.env.example`):
`VITE_API_URL` (backend) and `VITE_LOCALMIND_URL` (AI).

## Design system

All tokens live in `src/styles/tokens.css` and are the source of truth (colors,
type scale, spacing, radii, glass shadows, motion). Glass cards are frosted, never
opaque. See the full spec for the design language.

## Deploy

Frontend → Vercel. Backend → Render. Both already send permissive CORS +
`ngrok-skip-browser-warning` so a deployed frontend can reach a tunneled backend.
