# RevAssist Pro

Fullstack AI deal desk OS for powersports dealership F&I teams.

This app is the production-grade successor to the browser-only RevAssist demo. It keeps local development safe by defaulting to deterministic mock streaming, but the server route is wired for live AI generation through the Vercel AI SDK when gateway credentials are present.

## What Is Implemented

- Next.js App Router application.
- Streaming `POST /api/deals/analyze` endpoint using Server-Sent Events.
- AI SDK v6 structured-output path with `streamText` and `Output.object`.
- Mock-safe fallback for local development and CI.
- Signed `httpOnly` session cookie with tenant/user claims.
- Zod schemas for request, output, deal runs, and audit events.
- Per-user/dealer rate limiting.
- Repository boundary with in-memory local mode and Neon Postgres production mode.
- SQL schema for deal runs and audit events in `db/schema.sql`.
- Labeled eval fixtures with a regression scoring runner for output quality.
- Unit tests for schema, mock routing, copy formatting, rate limits, and repository lifecycle.
- Playwright smoke tests for the full generated workflow on desktop and mobile.

## Local Setup

```bash
cd pro
npm install
npm run dev
```

Open `http://localhost:3010`.

Copy `.env.example` to `.env.local` when adding live credentials or Postgres. Local development works without secrets.

## Validation

```bash
npm run lint
npm run typecheck
npm run test
npm run eval
npm run build
npx playwright install chromium
npm run smoke
```

## Live AI Mode

Mock mode is the default. To use live AI generation locally or on Vercel, provide gateway/provider credentials and set:

```bash
REVASSIST_AI_MODE=live
REVASSIST_MODEL=openai/gpt-5.4
```

The route checks for `VERCEL_OIDC_TOKEN`, `AI_GATEWAY_API_KEY`, or `OPENAI_API_KEY` before attempting live generation. Without credentials, it stays in deterministic mock mode so CI remains stable.

## Sessions And Persistence

The client opens a signed session through `POST /api/auth/demo`; the deal APIs then trust server-issued cookie claims instead of client-supplied headers. This keeps tenant and operator identity on the server side while remaining easy to demo.

Persistence is selected at runtime:

- No `DATABASE_URL`: uses the in-memory repository for fast local development and CI.
- `DATABASE_URL` present: uses Neon/Postgres through `@neondatabase/serverless`.
- `REVASSIST_REQUIRE_DATABASE=true`: fails fast if Postgres is not configured.

Apply `db/schema.sql` to a Neon database before enabling `DATABASE_URL`.

## Eval Runner

`npm run eval` runs the labeled regression suite in `lib/evals`. Each fixture checks profile routing, schema validity, summary relevance, add-on fit, compliance coverage, severity coverage, and follow-up SMS usefulness. CI fails if any fixture drops below its minimum score.

Use `npm run eval:json` when you want machine-readable results for dashboards or future release notes.

## Production Backlog

- Move rate limits to Redis or Vercel KV/Upstash.
- Replace the portfolio demo session issuer with Clerk/Auth0/Vercel Marketplace auth.
- Add live-model eval snapshots once provider credentials are configured.
- Add deployment config and production environment docs.
