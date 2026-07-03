# Deploying DebtLens

Architecture in production:

```
Vercel (frontend, static)  ──► Render (FastAPI backend, /debts /progress /parse-statement)
        │                              │
        └──────────────┬───────────────┘
                       ▼
        ngrok tunnel ──► LocalMind on your PC (:8000)  ← AI: explanations + PDF field extraction
```

LocalMind needs your local GPU/Ollama, so it can't be cloud-hosted — the
deployed app reaches it through an ngrok tunnel. Everything else is fully hosted.

---

## 1. Backend → Render

1. Push this repo to GitHub (done).
2. Render dashboard → **New → Blueprint** → select the `debtlens` repo. It reads
   `render.yaml` and creates the `debtlens-api` web service.
3. Set the one secret env var when prompted:
   - `LOCALMIND_URL` = your ngrok LocalMind URL (e.g. `https://xxxx.ngrok-free.app`).
     Leave blank to disable AI-based statement parsing.
4. Deploy. Your API is at `https://debtlens-api.onrender.com` (health: `/health`).

**Free-tier notes (already accounted for):**
- Cold start ~50s after 15 min idle. The frontend loads from `localStorage`
  immediately and syncs when the backend wakes, so the UI never blocks on it.
- SQLite is ephemeral (`/tmp`), so it resets on redeploy. Debts/progress are also
  mirrored to the browser's `localStorage`, so user data isn't lost. Attach a
  persistent disk (paid) for server-side durability.

## 2. Frontend → Vercel

1. Vercel → **Add New Project** → import the `debtlens` repo. It auto-detects Vite
   (`vercel.json` sets build `npm run build`, output `dist`, SPA rewrite).
2. Add **Environment Variables** (Production):
   - `VITE_API_URL` = `https://debtlens-api.onrender.com` (your Render URL)
   - `VITE_LOCALMIND_URL` = your ngrok LocalMind URL
3. Deploy → live at `https://debtlens.vercel.app`.

> These are baked in at build time, so changing them needs a redeploy.

## 3. LocalMind (the AI) via ngrok

On your PC, with LocalMind running on `:8000`:

```
ngrok http 8000
```

Use the resulting `https://…ngrok-free.app` URL for both `LOCALMIND_URL` (Render)
and `VITE_LOCALMIND_URL` (Vercel).

⚠️ **Free ngrok URLs rotate** each restart — when the URL changes you must update
Render's env var and redeploy the Vercel frontend. Use a **reserved ngrok domain**
(or Cloudflare Tunnel) for a stable URL and avoid the rebuilds.

CORS is already configured on the backend to accept any `*.vercel.app` origin and
any `*.ngrok-free.app` tunnel, and both echo `ngrok-skip-browser-warning`.
