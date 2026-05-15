# RevAssist Pro

Fullstack AI deal desk OS for powersports dealership F&I teams.

This app is the production-grade successor to the browser-only RevAssist demo. It keeps local development safe by defaulting to deterministic mock streaming, but the server route is wired for live AI generation through the Vercel AI SDK when gateway credentials are present.

Production deployment: [https://revassist-pro.vercel.app](https://revassist-pro.vercel.app). The live Vercel project is connected to Neon Postgres and Upstash Redis, with mock AI mode kept on until provider-backed eval snapshots are ready.

## What Is Implemented

- Next.js App Router application.
- Streaming `POST /api/deals/analyze` endpoint using Server-Sent Events.
- AI SDK v6 structured-output path with `streamText` and `Output.object`.
- Mock-safe fallback for local development and CI.
- Provider-agnostic `SessionClaims` boundary with signed demo cookies and optional OIDC/JWKS managed auth.
- Zod schemas for request, output, deal runs, and audit events.
- Per-user/dealer rate limiting with Upstash Redis production mode and in-memory local mode.
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

For production rollout, see [Deployment Runbook](docs/DEPLOYMENT.md).

For the managed-auth adapter and provider rollout path, see [Authentication](docs/AUTHENTICATION.md).

For the product and interview narrative, see [RevAssist Pro Case Study](../docs/case-studies/revassist-pro.md).

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

To smoke-test a deployed Vercel URL instead of starting a local server:

```bash
PLAYWRIGHT_BASE_URL=https://revassist-pro.vercel.app npm run smoke
```

Remote smoke tests validate the generated workflow output by default. After Neon persistence is configured, add `PLAYWRIGHT_EXPECT_DURABLE_HISTORY=true` to also require completed history and audit events across Vercel functions.

## Live AI Mode

Mock mode is the default. To use live AI generation locally or on Vercel, provide gateway/provider credentials and set:

```bash
REVASSIST_AI_MODE=live
REVASSIST_MODEL=openai/gpt-5.4
```

The route checks for `VERCEL_OIDC_TOKEN`, `AI_GATEWAY_API_KEY`, or `OPENAI_API_KEY` before attempting live generation. Without credentials, it stays in deterministic mock mode so CI remains stable.

## Sessions And Persistence

Local/demo mode opens a signed session through `POST /api/auth/demo`; the deal APIs then trust server-issued claims instead of client-supplied headers. This keeps tenant and operator identity on the server side while remaining easy to demo.

Production can disable demo sessions with `REVASSIST_REQUIRE_MANAGED_AUTH=true` and accept managed OIDC tokens from an `Authorization: Bearer` header or a configured same-origin token cookie. Provider JWTs are verified with `REVASSIST_AUTH_ISSUER`, `REVASSIST_AUTH_AUDIENCE`, and `REVASSIST_AUTH_JWKS_URL`, then mapped into the same internal `SessionClaims` shape used by APIs, repository writes, rate limits, and audit logs.

The provider rollout path is documented in [Authentication](docs/AUTHENTICATION.md). Clerk through Vercel Marketplace remains the fastest hosted UI option, while the current adapter also works with Auth0, Descope, or any issuer that can provide organization/dealership claims in a JWT.

Persistence is selected at runtime:

- No `DATABASE_URL`: uses the in-memory repository for fast local development and CI.
- `DATABASE_URL` present: uses Neon/Postgres through `@neondatabase/serverless`.
- `REVASSIST_REQUIRE_DATABASE=true`: fails fast if Postgres is not configured.

Apply `db/schema.sql` to a Neon database before enabling `DATABASE_URL`.

## Rate Limiting

The analyze endpoint rate-limits by dealership, operator, and client IP. Without Redis credentials it uses an in-memory store for local development and CI. With `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, or Vercel Marketplace `KV_REST_API_URL` / `KV_REST_API_TOKEN`, it switches to `@upstash/redis` so limits survive serverless instances and deploys.

Set `REVASSIST_REQUIRE_DURABLE_RATE_LIMIT=true` in production if the app should fail fast instead of falling back to memory when Redis is missing.

## Eval Runner

`npm run eval` runs the labeled regression suite in `lib/evals`. Each fixture checks profile routing, schema validity, summary relevance, add-on fit, compliance coverage, severity coverage, and follow-up SMS usefulness. CI fails if any fixture drops below its minimum score.

Use `npm run eval:json` when you want machine-readable results for dashboards or future release notes.

Use `npm run eval:report` to refresh the GitHub-readable [eval baseline report](docs/EVAL_BASELINE.md).

Use `npm run eval:live:report` to refresh the provider-backed [live eval snapshot](docs/LIVE_EVAL_SNAPSHOT.md). It loads `.env.local`, uses Vercel AI Gateway OIDC or `AI_GATEWAY_API_KEY` when present, and skips safely when provider credentials or account setup are unavailable. Use `npm run eval:live:required` when missing live credentials or incomplete AI Gateway setup should fail the command.

## Production Backlog

- Connect a hosted sign-in UI and provider org sync to the managed OIDC/JWKS auth adapter.
- Refresh live-model eval snapshots before changing prompts, model routing, or enabling live AI by default.
- Add OpenTelemetry or provider-backed error tracking after the first Vercel deployment.
