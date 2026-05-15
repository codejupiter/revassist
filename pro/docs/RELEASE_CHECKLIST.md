# RevAssist Pro Release Checklist

Use this checklist before publishing a GitHub release, sharing the Vercel URL publicly, or changing model/auth/storage behavior.

## Current Release

- Version: `0.1.0`
- Production URL: https://revassist-pro.vercel.app
- Vercel deployment: `dpl_28DPqBnc1pQUJTtoU9wxJkJqsF7y`
- Production mode: deterministic mock AI with Neon persistence and Upstash rate limits.
- Release notes: [RevAssist Pro v0.1.0](../../docs/releases/revassist-pro-v0.1.0.md)

## Required Gates

Run locally from `pro/`:

```bash
npm audit --omit=dev --audit-level=high
npm run lint
npm run typecheck
npm run test
npm run eval
npm run eval:live:report
npm run build
npm run smoke
PLAYWRIGHT_BASE_URL=https://revassist-pro.vercel.app PLAYWRIGHT_EXPECT_DURABLE_HISTORY=true npm run smoke
```

Expected result:

- Production audit reports zero high vulnerabilities.
- Unit tests pass.
- Deterministic eval pass rate is `5/5`.
- Live eval report either captures a provider-backed run or records a clear skip reason.
- Production build succeeds.
- Local and remote Playwright smoke tests pass on desktop and mobile.

## Release Readiness

- GitHub Actions are green for both RevAssist Pro CI and GitHub Pages deploy.
- Vercel production deployment is `READY` and aliased to `revassist-pro.vercel.app`.
- `/api/health` returns `{ "ok": true, "service": "revassist-pro", "mode": "mock" }`.
- Remote smoke tests prove generated workflow output, history, and audit trail.
- `docs/releases/revassist-pro-v0.1.0.md` links to CI, deployment, eval, auth, and runbook evidence.
- `CHANGELOG.md` includes the release.
- Production env vars keep `REVASSIST_AI_MODE=mock` until live eval snapshots pass.
- `REVASSIST_REQUIRE_MANAGED_AUTH` is only enabled after hosted auth is configured and preview-tested.

## Public Sharing Checklist

- README live links return `200`.
- Case study describes product problem, architecture, tradeoffs, and interview talking points.
- Release notes explain known limits honestly.
- No raw customer data, secrets, or provider tokens appear in docs, logs, fixtures, screenshots, or reports.
- Open issues or roadmap items are phrased as product next steps, not broken functionality.

## Rollback

If a deployment regresses:

```bash
npx vercel rollback
```

Then verify:

```bash
curl https://revassist-pro.vercel.app/api/health
PLAYWRIGHT_BASE_URL=https://revassist-pro.vercel.app PLAYWRIGHT_EXPECT_DURABLE_HISTORY=true npm run smoke
```

## Next Release Candidates

- `0.2.0`: hosted managed-auth sign-in and provider organization sync.
- `0.3.0`: successful provider-backed live eval snapshot and opt-in live AI preview.
- `0.4.0`: human-in-the-loop edited output state and saved recommendation drafts.
