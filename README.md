# NEET AI College Predictor

Admin-curated NEET counselling/cutoff data (stored in MongoDB Atlas) drives a
deterministic prediction engine; two independently-configured AI providers
(Groq for general chat, OpenAI for predictor intent-extraction/explanation)
provide the conversational layer on top. The AI never invents college,
cutoff, fee, or seat data — it only explains records the backend already
retrieved from MongoDB.

## Project structure

```
client/   React + Vite + Tailwind frontend
server/   Node.js + Express + Mongoose backend
```

See `server/config`, `server/models`, `server/services`, `server/routes` for
the backend; `client/src/pages`, `client/src/components` for the frontend.

## Prerequisites

- Node.js 18+
- A MongoDB Atlas cluster (database name: `counselai`)
- A Groq API key (general chat) — https://console.groq.com
- An OpenAI API key (predictor: intent extraction + explanations)

## Setup

1. Copy the env file and fill in real credentials:

   ```bash
   cp .env.example .env
   ```

   Required: `MONGO_URI` (Atlas connection string), `JWT_SECRET` (any long
   random string), `OPENAI_API_KEY` (Groq), `OPENAI_PREDICTOR_API_KEY`
   (OpenAI), `OPENAI_PREDICTOR_MODEL` (a model your OpenAI account can call),
   and `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` for the first admin login.

2. Install dependencies:

   ```bash
   npm run install:all
   ```

3. Seed the first admin account (reads `SEED_ADMIN_*` from `.env`):

   ```bash
   npm run seed:admin
   ```

4. Run the backend and frontend in two terminals:

   ```bash
   npm run dev:server   # http://localhost:5000
   npm run dev:client   # http://localhost:5173 (proxies /api to the server)
   ```

5. Open http://localhost:5173, and http://localhost:5173/login for the admin
   panel.

## How data flows

```
Admin uploads Excel/CSV/PDF
  -> parsed (SheetJS for spreadsheets; pdf-parse + OCR fallback for PDFs)
  -> column mapping auto-detected (admin can correct it)
  -> every row normalized + validated, staged (not yet live)
  -> admin reviews the validation report and imports valid rows
     into Cutoff/College collections (dataset status: validated)
  -> admin publishes the dataset (status: published)
  -> only published datasets are visible to /api/predict and /api/chat
```

The prediction engine (`server/services/counsellingEngine.js`) is the only
thing that decides which colleges match a rank — it queries MongoDB
directly. The AI layer (`server/services/openaiPredictorService.js`) only
(a) converts a chat message into structured filters and (b) writes a
natural-language explanation of the records the engine already returned. It
is explicitly instructed to say "insufficient data" rather than invent
anything, and the chat flow still works (with reduced natural-language
understanding) even if no AI keys are configured.

## OCR fallback

Scanned/image-only PDF pages are rendered with `pdfjs-dist` and
`@napi-rs/canvas` (prebuilt binaries, no native build toolchain required)
and OCR'd with `tesseract.js`, gated by `PDF_OCR_ENABLED` /
`PDF_OCR_MAX_PAGES` / `PDF_PARSE_TIMEOUT_MS` in `.env`. If OCR isn't needed,
these dependencies are never touched.

## Verification already performed

Because this environment has no real Atlas cluster or paid API keys, the
full pipeline (upload -> validate -> import -> publish -> predict -> chat,
including admin JWT auth and rejecting unauthenticated requests) was
verified end-to-end over real HTTP against a temporary in-memory MongoDB
instance. AI-dependent natural-language understanding falls back to
deterministic handling for the core flow (numeric rank, "All India Quota" /
"State Counselling") when no AI key is present, so the app is usable
immediately; full AI-grounded conversation should be re-verified once you
add real Groq/OpenAI keys.

## Production deployment

**Frontend:**

```bash
cd client
npm install
npm run build
```

Serve `client/dist` through Nginx as static files.

**Backend:**

```bash
cd server
npm install
pm2 start server.js --name neet-predictor-api
pm2 save
```

**Nginx** (sketch): serve `client/dist` at `/`, reverse-proxy `/api` to the
Node process (`http://localhost:5000`).

**MongoDB:** Atlas only — do not install MongoDB locally on the VPS.

Set real environment variables on the server (never commit `.env`). Rotate
`JWT_SECRET` and all API keys before going to production, and restrict your
Atlas cluster's network access list to the VPS's IP.
