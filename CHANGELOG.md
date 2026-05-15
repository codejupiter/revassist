# Changelog

All notable changes to RevAssist are documented here.

## 0.1.0 - 2026-05-15

### Added

- Launched the browser-only RevAssist demo on GitHub Pages with a mock-safe streaming deal workflow.
- Added RevAssist Pro, a Next.js App Router SaaS foundation deployed to Vercel.
- Added Server-Sent Events streaming for deal analysis with partial and final output events.
- Added schema-locked deal request, output, run, and audit-event validation with Zod.
- Added signed demo sessions plus an OIDC/JWKS managed-auth adapter that maps provider JWTs into `SessionClaims`.
- Added Neon Postgres persistence for deal history and audit events.
- Added Upstash Redis-backed rate limiting with in-memory fallback for local development and CI.
- Added deterministic eval fixtures, scoring, a GitHub-readable eval baseline, and provider-backed live eval snapshot tooling.
- Added production deployment, authentication, architecture, and case-study documentation.
- Added unit, eval, build, and Playwright smoke gates in GitHub Actions.

### Verified

- RevAssist Pro production app: https://revassist-pro.vercel.app
- GitHub Pages demo: https://codejupiter.github.io/revassist/
- RevAssist Pro CI, GitHub Pages deploy, local production build, and remote durable smoke tests passed for the release line.

### Known Limitations

- Production AI remains in mock mode until Vercel AI Gateway billing/free-credit setup is complete and a successful live eval snapshot is captured.
- Hosted sign-in UI and provider organization sync are documented and adapter-ready, but not yet connected to a managed auth provider account.
- DMS, credit-bureau, and CRM integrations are intentionally out of scope for this portfolio release.
