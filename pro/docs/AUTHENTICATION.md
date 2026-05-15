# RevAssist Pro Authentication Migration

RevAssist Pro currently uses a signed demo session so the portfolio app can run locally and in CI without a third-party identity provider. The production target is managed authentication with organization-aware dealership access, while preserving the existing server-owned `SessionClaims` contract used by deal analysis, history, rate limits, audit logs, and persistence.

## Current Demo Adapter

The current flow is intentionally small:

- `POST /api/auth/demo` issues a signed `httpOnly` cookie.
- `GET /api/auth/session` returns a public session shape for the client shell.
- Deal APIs call `getSessionFromRequest(request)` and reject unauthenticated requests.
- Dealer and operator IDs are taken from trusted server claims, not client payload fields.

This protects the important architectural boundary for a portfolio/demo environment. It is not intended to replace managed auth for a real dealership rollout.

## Production Target

The production auth system should provide:

- Email, SSO, or passwordless login.
- Organization/dealership membership.
- Role claims for F&I manager, director, and admin permissions.
- Server-side session validation in API routes.
- Middleware protection for app and API routes.
- A stable mapping from provider identity to RevAssist tenant claims.

Recommended first provider: Clerk through the Vercel Marketplace. It gives the fastest path to hosted sign-in UI, organization support, Vercel env provisioning, and Next.js middleware. Descope is a good alternative for passwordless workflow-heavy auth. Auth0 is the stronger option when enterprise SSO/SAML is the primary product requirement.

## Claim Contract

Keep the app-level contract provider-agnostic:

| RevAssist claim | Production source | Used by |
| --- | --- | --- |
| `sessionId` | Provider session ID | Audit logs, traceability |
| `userId` | Provider user ID | Rate limits, audit actor, run ownership |
| `dealerId` | Provider organization ID or internal dealership row | Tenant isolation, history queries, rate limits |
| `role` | Provider org role or internal membership table | Future authorization checks |
| `name` | Provider user profile | Client shell, audit context |
| `dealerName` | Provider organization name or internal dealership row | Client shell, audit context |
| `iat` / `exp` | Provider session timestamps | Session freshness |

The existing `SessionClaims` schema should remain the internal boundary. Provider-specific code should only map into this shape.

## Migration Plan

1. Install the provider through the Vercel Marketplace when available so production and preview env vars are provisioned to the linked project.
2. Install the provider SDK in `pro/`.
3. Add a provider wrapper to `app/layout.tsx`.
4. Add sign-in and sign-up routes.
5. Add middleware that protects the workbench and deal APIs while allowing `/api/health`.
6. Replace `POST /api/auth/demo` with provider-driven sign-in in production, keeping the demo issuer available only for local demo/CI if needed.
7. Replace `getSessionFromRequest(request)` internals with a provider adapter that returns the existing `SessionClaims` shape.
8. Persist dealership/org mappings in Postgres so `dealerId` is stable even if a provider organization slug changes.
9. Add authorization checks for director/admin-only actions before adding multi-role workflows.
10. Update smoke tests to sign in through a test user or use a sealed test-session helper in CI.
11. Remove demo-only session code from production builds once the managed provider is verified in preview.

## Middleware Shape

Protect these surfaces:

- `/` workbench routes.
- `/api/deals/analyze`
- `/api/deals/history`
- Any future admin, settings, billing, or member-management routes.

Allow these surfaces:

- `/api/health`
- Static assets and Next.js internals.
- Provider callback routes.

## Environment Variables

Provider-specific variables should stay server-only unless the SDK explicitly requires a publishable client key. Never expose secrets with a `NEXT_PUBLIC_` prefix.

Expected categories:

- Provider secret key.
- Provider publishable key when required by the SDK.
- Sign-in/sign-up route URLs.
- Webhook secret for user/org membership sync.
- Optional internal test user credentials for smoke tests, scoped to preview/CI only.

## Data Model Additions

Before adding real customer tenants, add or extend tables for:

- Dealership organizations.
- User memberships.
- Provider identity mappings.
- Role assignments.
- Auth webhook events.

The deal-run tables should continue storing internal `dealer_id` and `operator_id` values, not provider-specific raw payloads.

## Security Checklist

- API routes never trust dealer/operator IDs from client request bodies.
- Session lookup fails closed.
- Tenant history queries are filtered by server-owned `dealerId`.
- Rate limits include tenant, user, and client IP dimensions.
- Audit logs record user/dealer IDs but not raw provider tokens.
- Provider webhooks verify signatures.
- Preview and production use separate provider applications or environments.
- Test users cannot access production data.

## Validation Plan

Run the existing suite after the provider adapter lands:

```bash
npm audit --omit=dev --audit-level=high
npm run lint
npm run typecheck
npm run test
npm run eval
npm run build
npm run smoke
```

Add targeted tests for:

- Unauthenticated API rejection.
- Valid provider session mapping.
- Missing organization membership rejection.
- Role mapping for F&I manager, director, and admin.
- Tenant isolation in history queries.
- CI smoke sign-in path.

## Interview Talking Points

- The demo cookie is a replaceable adapter, not the product's trust boundary.
- The app already avoids client-owned tenant identity, so moving to managed auth is mostly an adapter swap.
- Keeping `SessionClaims` provider-agnostic prevents auth vendor details from leaking into deal analysis, persistence, rate limits, and audit logging.
- Organization mapping is treated as product data because dealership identity must stay stable across provider changes.
