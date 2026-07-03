# DebtLens

**AI-powered debt intelligence — understand your whole debt picture, see the math behind every recommendation, and feel the human cost of each decision.**

> 📐 See **[DEPLOY.md](DEPLOY.md)** for the production topology (Vercel + Render +
> ngrok'd LocalMind) and step-by-step deployment.
live on https://debtlens-gray.vercel.app/

DebtLens is not a payoff calculator. It's a debt *intelligence* layer: it models
your entire portfolio, finds the mathematically optimal way to attack it,
explains its reasoning in plain English, and translates abstract interest into
things you actually feel — months of freedom, trips you could take, hours of
your life. It pairs a premium, Monzo/Robinhood-grade interface with a real
optimization engine and a streaming AI explanation layer served by
[LocalMind](https://github.com/SHREY-FR4NKL1NNN/localmind).

## Why this is more than a calculator

Most debt tools ask for a balance and spit out a number. The interesting
problems live one layer deeper:

- **Optimization, not a formula.** "Snowball vs avalanche" is a false binary.
  DebtLens searches every attack order to find the plan that minimizes total
  interest, models payment rollover as debts clear, and handles extra-payment
  capacity and one-time windfalls.
- **Explanation, not advice copy.** Generic "pay high-interest first" tips don't
  build trust. DebtLens streams a *contextual* explanation of your specific
  numbers from a local LLM: why avalanche saves *you* $X, and whether it's right
  for *your* situation.
- **Consequence, made concrete.** $4,200 of interest is an abstraction. "6 months
  of groceries / 2.3 trips to Japan / 150 hours of your life" is not. Making the
  cost visceral is the point.

## Features

Seven screens, each designed end-to-end — including empty and loading states:

1. **Dashboard** — a Playfair hero of total debt (counting up on load), payoff
   date, interest remaining, and a color-coded card per debt with a % paid-off
   bar.
2. **Add / Manage Debts** — a slide-in drawer (right on desktop, bottom on
   mobile) with a **PDF statement import**: pdf.js extracts the text in-browser,
   the backend asks LocalMind to pull out balance / APR / minimum, and you
   confirm the parsed values before saving.
3. **Strategy Comparison** — snowball vs avalanche vs a search-based **optimal**
   plan, side by side, over a unified balance-over-time area chart, with a
   templated "why these differ" breakdown and a streaming **"Explain this to me"**
   panel.
4. **Scenario Simulator** — drag an extra-payment slider or drop in a windfall
   and watch the payoff date, interest-saved counter, and chart update live
   (150 ms-debounced). Settle for two seconds and the AI weighs in on risks.
5. **Financial Calendar** — a Gantt-style timeline of exactly when each debt
   ends, color-coded, with first-payoff / halfway / debt-free milestone markers
   and tap-to-inspect month details.
6. **Life Cost** — every debt's interest translated into groceries, flights,
   trips, and **hours of your life** (from a one-time income input), with a
   time / experiences / dollars lens toggle.
7. **Progress Tracker** — log balances monthly and see your **actual vs
   projected** payoff curve, an on-track **streak** counter, and what changed
   since last check-in.

Plus: a full glass-morphism design system, dark mode with no flash, count-up
number animations, staggered page entries, and a first-class mobile layout
(bottom nav, stacked cards, full-width charts).

## The engine

The analytical core lives in [`src/lib/finance.ts`](src/lib/finance.ts) and runs
entirely client-side.

- **Amortization simulation.** A fixed monthly budget = Σ(minimum payments) +
  extra attacks debts in a strategy-defined order. Interest accrues monthly, each
  debt pays at least its minimum, and everything left over is thrown at the
  target debt. Freed-up minimums roll into the budget as debts clear (the
  standard rollover assumption), and a non-amortizing guard catches inputs where
  the budget can't cover interest.
- **Three strategies.**
  - *Snowball* — smallest balance first (motivational).
  - *Avalanche* — highest APR first (interest-optimal under a fixed budget).
  - *Optimal* — a brute-force search over every attack ordering (for ≤ 7 debts;
    avalanche fallback beyond) that minimizes **total interest**, ties broken by
    fewer months. Computed independently so it stays correct for unusual
    portfolios.
- **Scenario modeling.** `runScenario()` diffs a base plan (minimums only)
  against a scenario with extra payments and an optional windfall applied to a
  chosen debt, yielding months saved and interest saved.
- **Per-debt cost.** `standaloneInterest()` isolates the interest a single debt
  will accrue on its own minimum — the "interest wasted" figure the Life Cost
  view translates into human terms.

Everything downstream (charts, calendar, life-cost, progress projection) is a
projection of this one engine, so the numbers are always internally consistent.

## The AI layer

Explanations and statement parsing are served by **LocalMind**, a local
Mixture-of-Experts LLM router, so no data leaves your machine and there's no API
key.

- **Streaming explanations.** The Strategy and Simulator screens POST to
  LocalMind's `/query/decomposed/stream` and render the `combiner_token` SSE
  stream — the synthesized answer — token-by-token into a glass panel. Prompts
  are built from the live numbers (debt count, totals, interest saved, months
  earlier). See [`src/lib/localmind.ts`](src/lib/localmind.ts).
- **Statement parsing.** The backend forwards extracted PDF text to LocalMind's
  `/query`, asks for a strict JSON object, and falls back to regex heuristics if
  LocalMind is unreachable or returns something unparseable — so the feature
  degrades gracefully. See
  [`backend/statement_parser.py`](backend/statement_parser.py).

Both features fail soft: if LocalMind is down, the rest of the app is fully
usable and the UI shows a clear "couldn't reach LocalMind" state.

## Architecture

```
React + Vite + TS (Vercel)
  ├─ finance.ts .............. client-side debt engine (strategies, scenarios)
  ├─ DebtContext ............. global store, backend-synced + localStorage mirror
  ├─ Recharts ................ area / composed charts, custom glass tooltips
  ├─ Framer Motion ........... drawer, page entry, bar animations
  └─ calls
       ├─► FastAPI + SQLite (Render) ..... /debts /profile /progress /parse-statement
       └─► LocalMind (:8000 via ngrok) ... /query/decomposed/stream, /query
                                            (AI explanations + PDF field extraction)
```

- **Persistence is layered.** The FastAPI + SQLite backend is the source of
  truth, but `DebtContext` mirrors every change to `localStorage` and hydrates
  from it first — so the app is instant on load and survives the backend being
  asleep (Render free tier) or offline.

## Design system

All tokens are defined once in
[`src/styles/tokens.css`](src/styles/tokens.css) and are the single source of
truth — colors, a type scale, spacing, radii, glass shadows, and motion curves,
with a full dark-mode override.

- **Typography** — Playfair Display for storytelling (hero numbers, headings),
  **JetBrains Mono** for *all* data (money, percentages, dates, with
  `tabular-nums`), Inter for UI. Mono-for-data is the fintech-native touch.
- **Glass** — every card is frosted (`backdrop-filter: blur(16px) saturate(1.8)`),
  never opaque, so the ambient background shows through.
- **One accent** — a single green that always means "money moving in your favor."
- **Motion with reason** — numbers count up, charts draw in, cards lift 2px on
  hover, the theme crossfades. Everything respects `prefers-reduced-motion`.

## API (backend)

FastAPI on `:8010`. CORS allows any `*.vercel.app` origin and `*.ngrok-free.app`
tunnel; every response echoes `ngrok-skip-browser-warning`.

| Method | Route              | Purpose                                        |
|--------|--------------------|------------------------------------------------|
| GET    | `/health`          | Liveness.                                      |
| GET    | `/debts`           | All debts.                                     |
| PUT    | `/debts`           | Replace the full debt list.                    |
| GET    | `/profile`         | User profile (income for Life Cost).           |
| PUT    | `/profile`         | Update profile.                                |
| GET    | `/progress`        | All monthly check-ins.                         |
| POST   | `/progress`        | Add a check-in.                                |
| POST   | `/parse-statement` | PDF text → `{balance, apr, minimumPayment}` via LocalMind. |

## Setup & run

### Prerequisites
- Node 18+ and npm
- Python 3.12
- [LocalMind](https://github.com/SHREY-FR4NKL1NNN/localmind) running on `:8000`
  (only needed for AI explanations + PDF parsing; the rest works without it)

### Backend (FastAPI + SQLite) — `:8010`
```bash
cd backend
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # (Scripts → bin on macOS/Linux)
.venv/Scripts/python -m uvicorn main:app --port 8010 --host 127.0.0.1
```

### Frontend (Vite) — `:5173`
```bash
npm install
npm run dev
```

Open http://localhost:5173. Override endpoints via `.env.local` (see
[`.env.example`](.env.example)): `VITE_API_URL` (backend) and
`VITE_LOCALMIND_URL` (AI).

## Deployment

Frontend → **Vercel** (Vite preset, `vercel.json` adds the SPA rewrite so
client-side routes don't 404). Backend → **Render** (`render.yaml` blueprint).
AI → your local LocalMind exposed via **ngrok**. Full walkthrough, env vars, and
free-tier caveats in **[DEPLOY.md](DEPLOY.md)**.

## Technical decisions

- **The engine is client-side.** All strategy math runs in the browser for
  instant, offline-capable what-ifs; the backend only persists state and proxies
  AI. No round-trip per slider tick.
- **Optimal is a real search, not a relabeled avalanche.** It's computed
  independently by minimizing total interest across orderings, so it stays
  honest — and when it coincides with avalanche (as it usually does with fixed
  APRs), that's a *result*, surfaced in the "why these differ" copy.
- **localStorage mirror as a resilience layer.** Because progress data mirrors to
  the browser, Render's ephemeral free-tier SQLite resetting doesn't lose a
  user's data, and cold starts never block the UI.
- **AI degrades gracefully.** Every LocalMind call has a fallback path, so a
  missing AI layer never breaks the product.

## Project layout

```
debtlens/
├── src/
│   ├── screens/     Dashboard, Debts, Strategy, Simulator, Calendar, LifeCost, Progress
│   ├── components/  GlassCard, DebtCard, DebtDrawer, Navigation, ExplanationPanel, charts, icons
│   ├── lib/         finance.ts (engine) · localmind.ts · api.ts · pdf.ts · format.ts · colors.ts
│   ├── hooks/       useCountUp · useDebounce · useExplanation · useMediaQuery
│   ├── state/       DebtContext (global store)
│   └── styles/      tokens.css (design system)
├── backend/
│   ├── main.py              FastAPI app + routes
│   ├── db.py                SQLite (kv + progress)
│   ├── statement_parser.py  PDF text → LocalMind → fields
│   └── requirements.txt
├── vercel.json      SPA rewrite
├── render.yaml      backend blueprint
└── DEPLOY.md
```

## What I'd build next

- A persistent Postgres store (swap the SQLite kv layer) for real multi-device sync.
- Variable-rate and promotional-APR schedules per debt.
- A pytest suite for the engine's edge cases + GitHub Actions CI.
- Reserved ngrok domain (or hosted model) so the AI layer stays up without rebuilds.
