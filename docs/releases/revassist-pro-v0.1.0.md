# RevAssist Pro v0.1.0 Release Notes

Release date: 2026-05-15  
Status: Production portfolio release  
Production URL: https://revassist-pro.vercel.app

## Summary

RevAssist Pro v0.1.0 turns the original browser-only AI deal desk demo into a production-shaped fullstack SaaS application. The release demonstrates streaming AI workflow UX, server-owned tenant identity, durable storage, rate limiting, auditability, eval-gated output quality, and a real deployment path on Vercel.

## Product Scope

RevAssist Pro helps powersports F&I teams turn raw deal notes into four structured workflow artifacts:

- Internal deal summary.
- Suggested F&I add-ons with rationale and price ranges.
- Compliance flags grouped by severity.
- Customer follow-up SMS copy.

The product is intentionally structured rather than chat-based so the output can be validated, audited, copied, and discussed in interviews as a workflow system.

## Engineering Highlights

- Next.js App Router application under `pro/`.
- Streaming `POST /api/deals/analyze` route using Server-Sent Events.
- Vercel AI SDK v6 structured-output path with deterministic mock mode for stable CI.
- Zod schemas across request payloads, model output, run records, and audit events.
- Provider-agnostic `SessionClaims` boundary with signed demo sessions and OIDC/JWKS managed-auth support.
- Neon Postgres repository adapter for deal history and audit events.
- Upstash Redis-backed fixed-window rate limiting by dealership, operator, and client IP.
- Structured server logs without raw deal-note logging.
- Deterministic eval suite and live-model snapshot workflow.
- Local, GitHub Actions, Vercel production, and remote Playwright smoke validation.

## Release Evidence

- RevAssist Pro CI: https://github.com/codejupiter/revassist/actions/runs/25937524461
- GitHub Pages deploy: https://github.com/codejupiter/revassist/actions/runs/25937524450
- Vercel deployment: https://vercel.com/codejupiters-projects/revassist-pro/28DPqBnc1pQUJTtoU9wxJkJqsF7y
- Deterministic eval baseline: [pro/docs/EVAL_BASELINE.md](../../pro/docs/EVAL_BASELINE.md)
- Live eval snapshot workflow: [pro/docs/LIVE_EVAL_SNAPSHOT.md](../../pro/docs/LIVE_EVAL_SNAPSHOT.md)
- Deployment runbook: [pro/docs/DEPLOYMENT.md](../../pro/docs/DEPLOYMENT.md)
- Authentication docs: [pro/docs/AUTHENTICATION.md](../../pro/docs/AUTHENTICATION.md)

## Interview Story

This release is built to support a senior engineering conversation:

- Why structured workflow generation is safer than generic chat for dealership operations.
- How SSE improves perceived latency while preserving schema validation.
- Why tenant identity belongs in server-owned claims, not client payloads.
- How Redis rate limits and Postgres audit logs turn a demo into SaaS infrastructure.
- How deterministic evals and live snapshots create a quality gate for AI product changes.
- What remains before a real customer rollout: hosted auth, live model validation, DMS integrations, and privacy/legal review.

## Known Limits

- The production deployment is intentionally running in mock AI mode until provider-backed evals pass.
- The managed-auth adapter is implemented, but hosted sign-in and org sync require provider account setup.
- Synthetic eval fixtures are used; no real customer data is included in this release.
