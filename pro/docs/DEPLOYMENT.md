# RevAssist Pro Deployment Runbook

This runbook describes how to deploy RevAssist Pro as a production-shaped Vercel app with Neon Postgres, Upstash Redis, server-owned session claims, structured logs, and rollback procedures.

## Deployment Shape

- Host: Vercel.
- Framework: Next.js App Router.
- Vercel root directory: `pro`.
- Database: Neon Postgres through the Vercel Marketplace.
- Rate limit store: Upstash Redis through the Vercel Marketplace.
- AI mode: deterministic mock by default; live mode when AI Gateway or provider credentials are present.
- Public demo safety: the browser-only GitHub Pages demo remains separate from the Pro app.

## Required Services

Provision these through the Vercel Marketplace when possible so environment variables are injected into the linked project:

- Neon Postgres for `DATABASE_URL`.
- Upstash Redis for `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- Vercel AI Gateway or provider credentials for live generation.

Apply the schema in `db/schema.sql` before enabling the Postgres repository in production.

For the managed-auth migration from signed demo sessions to provider-backed sessions, see [Authentication Migration](AUTHENTICATION.md).

## Environment Variables

Server-only variables:

| Variable | Production | Preview | Local |
| --- | --- | --- | --- |
| `REVASSIST_SESSION_SECRET` | Required | Required | Optional |
| `REVASSIST_AI_MODE` | `mock` or `live` | `mock` preferred | `mock` |
| `REVASSIST_MODEL` | Optional | Optional | Optional |
| `DATABASE_URL` | Required for Postgres | Optional | Optional |
| `REVASSIST_REQUIRE_DATABASE` | `true` after DB launch | `false` | `false` |
| `UPSTASH_REDIS_REST_URL` | Required for durable limits | Optional | Optional |
| `UPSTASH_REDIS_REST_TOKEN` | Required for durable limits | Optional | Optional |
| `REVASSIST_REQUIRE_DURABLE_RATE_LIMIT` | `true` after Redis launch | `false` | `false` |
| `REVASSIST_RATE_LIMIT_PREFIX` | Optional | Optional | Optional |
| `AI_GATEWAY_API_KEY` / `OPENAI_API_KEY` | Required only for live mode | Avoid unless needed | Optional |

Never expose these with a `NEXT_PUBLIC_` prefix.

## Local Bootstrap

```bash
cd pro
npm install
cp .env.example .env.local
npm run dev
```

When the app is linked to Vercel:

```bash
vercel link
vercel env pull .env.local --yes
```

Re-run `vercel env pull .env.local --yes` after adding Marketplace integrations or rotating secrets.

## Production Validation

Run this before promoting a deployment:

```bash
cd pro
npm audit --omit=dev --audit-level=high
npm run lint
npm run typecheck
npm run test
npm run eval
npm run build
npx playwright install chromium
npm run smoke
PLAYWRIGHT_BASE_URL=https://<deployment-url> npm run smoke
PLAYWRIGHT_BASE_URL=https://<deployment-url> PLAYWRIGHT_EXPECT_DURABLE_HISTORY=true npm run smoke
```

Expected quality gates:

- Unit tests cover auth/session signing, repository mapping, rate limits, schemas, and eval failure cases.
- `npm run eval` should report `Pass rate: 5/5`.
- `npm run eval:report` should refresh `docs/EVAL_BASELINE.md` when eval fixtures change.
- Smoke tests should pass on desktop and mobile Chromium.
- Remote smoke tests should pass against the Vercel deployment URL before promotion or public sharing.
- Set `PLAYWRIGHT_EXPECT_DURABLE_HISTORY=true` after Neon is configured so remote smoke tests also prove cross-function history/audit persistence.

## Vercel Deployment

Recommended Vercel project settings:

- Root Directory: `pro`.
- Install Command: `npm ci`.
- Build Command: `npm run build`.
- Output Directory: Next.js default.

Git integration can deploy previews automatically. For manual CLI deployments:

```bash
cd pro
vercel deploy
vercel deploy --prod
```

For CI-controlled deployments:

```bash
vercel pull --yes --environment=production --token=$VERCEL_TOKEN
vercel build --prod --token=$VERCEL_TOKEN
vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN
```

Required CI secrets for CLI deploys:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Observability

The API routes emit structured JSON logs. Important event names:

- `auth.demo_session.created`
- `auth.session.read`
- `auth.session.deleted`
- `deals.history.read`
- `deals.history.unauthorized`
- `deals.analyze.started`
- `deals.analyze.completed`
- `deals.analyze.failed`
- `deals.analyze.rate_limited`
- `deals.analyze.rate_limit_unavailable`
- `deals.analyze.invalid_request`

Useful log fields:

- `requestId`: from `x-vercel-id` or `x-request-id`.
- `route`: API route and method.
- `deployment`: Vercel deployment host or `local`.
- `dealerId`, `userId`, `runId`.
- `mode`, `model`, `latencyMs`.
- `rateLimitStore`, `rateLimitRemaining`.

Do not log raw deal notes or customer PII.

Runtime log commands:

```bash
vercel logs <deployment-url>
vercel logs <deployment-url> --follow
vercel inspect <deployment-url>
```

Health check:

```bash
curl https://<deployment-url>/api/health
```

## Launch Checklist

1. Vercel project root is set to `pro`.
2. `REVASSIST_SESSION_SECRET` is present in production and preview.
3. Neon is provisioned and `db/schema.sql` has been applied.
4. `DATABASE_URL` is present.
5. `REVASSIST_REQUIRE_DATABASE=true` is set after DB validation.
6. Upstash Redis is provisioned.
7. `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are present.
8. `REVASSIST_REQUIRE_DURABLE_RATE_LIMIT=true` is set after Redis validation.
9. AI remains `mock` until live provider credentials and eval snapshots are ready.
10. Production validation suite passes.
11. `/api/health` returns `{ "ok": true }`.
12. A deal analysis produces `deals.analyze.completed` logs.

## Rollback

If a production deployment is unhealthy:

```bash
vercel rollback
```

Rollback to a specific deployment:

```bash
vercel rollback <deployment-url-or-id>
```

Promotion pattern:

```bash
vercel promote <validated-preview-url>
```

Use `promote` when a preview deployment has already passed validation and should become production without rebuilding.

## Incident Triage

1. Check `/api/health`.
2. Inspect the latest deployment.
3. Stream runtime logs.
4. Search for `level:error` and `deals.analyze.failed`.
5. If responses are `503`, check Redis env vars and Upstash availability.
6. If history is empty or failing, check `DATABASE_URL`, schema application, and Neon availability.
7. If live AI fails, switch `REVASSIST_AI_MODE=mock` while provider credentials or model routing are fixed.
8. Roll back if the current deployment blocks deal analysis.

## Interview Talking Points

- The Pro app separates public demo safety from deployable SaaS infrastructure.
- Session claims are server-signed and deal identity is not trusted from client payloads.
- Postgres and Redis clients are lazy-initialized so first deploys and CI are not blocked by missing Marketplace env vars.
- Production can fail fast on missing database or durable rate-limit dependencies.
- Structured logs give request, tenant, run, model, latency, and rate-limit visibility without logging raw customer notes.
- Rollback and promote flows are documented so the project has an operational story, not only an implementation story.
