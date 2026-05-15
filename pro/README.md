# RevAssist Pro

Fullstack AI deal desk OS for powersports dealership F&I teams.

This app is the production-grade successor to the browser-only RevAssist demo. It keeps local development safe by defaulting to deterministic mock streaming, but the server route is wired for live AI generation through the Vercel AI SDK when gateway credentials are present.

## What Is Implemented

- Next.js App Router application.
- Streaming `POST /api/deals/analyze` endpoint using Server-Sent Events.
- AI SDK v6 structured-output path with `streamText` and `Output.object`.
- Mock-safe fallback for local development and CI.
- Zod schemas for request, output, deal runs, and audit events.
- Per-user/dealer rate limiting.
- In-memory deal history and audit trail.
- Unit tests for schema, mock routing, copy formatting, rate limits, and repository lifecycle.
- Playwright smoke tests for the full generated workflow on desktop and mobile.

## Local Setup

```bash
cd pro
npm install
npm run dev
```

Open `http://localhost:3010`.

## Validation

```bash
npm run lint
npm run typecheck
npm run test
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

## Production Backlog

- Replace the in-memory repository with a Postgres adapter.
- Replace demo headers with real auth/session claims.
- Move rate limits to Redis or Vercel KV/Upstash.
- Add an eval runner with labeled fixture deals.
- Add deployment config and production environment docs.
