# RevAssist Pro Authentication

RevAssist Pro uses a provider-agnostic `SessionClaims` boundary for every deal-analysis, history, rate-limit, persistence, and audit workflow. Local and portfolio demos can still use signed `httpOnly` cookies, while production environments can require managed OIDC/JWKS tokens from Clerk, Auth0, Descope, or another identity provider.

## Current Adapter

`getSessionFromRequest(request)` resolves identity in this order:

1. If managed auth is configured, verify a provider JWT from `Authorization: Bearer <token>` or from `REVASSIST_AUTH_TOKEN_COOKIE`.
2. Map the verified JWT into the internal `SessionClaims` shape.
3. If demo auth is allowed, fall back to the signed `revassist_session` cookie.
4. Fail closed when no valid managed or demo session exists.

`POST /api/auth/demo` issues a signed demo cookie only when demo auth is allowed. Setting `REVASSIST_REQUIRE_MANAGED_AUTH=true` disables the demo cookie path so production cannot accidentally rely on portfolio credentials.

## Managed Auth Configuration

Use these environment variables for provider-backed sessions:

| Variable | Purpose |
| --- | --- |
| `REVASSIST_REQUIRE_MANAGED_AUTH` | Set to `true` to reject signed demo cookies and require provider JWTs. |
| `REVASSIST_ALLOW_DEMO_AUTH` | Set to `false` to disable `POST /api/auth/demo`; managed-required mode disables it automatically. |
| `REVASSIST_AUTH_ISSUER` | Expected JWT issuer, such as a Clerk/Auth0/Descope issuer URL. |
| `REVASSIST_AUTH_AUDIENCE` | Optional expected audience when the provider includes one. |
| `REVASSIST_AUTH_JWKS_URL` | Remote JSON Web Key Set used to verify provider JWT signatures. |
| `REVASSIST_AUTH_TOKEN_COOKIE` | Optional same-origin cookie name containing the provider JWT. |
| `REVASSIST_AUTH_JWKS_JSON` | Optional inline JWKS for tests or controlled local environments; prefer `REVASSIST_AUTH_JWKS_URL` in production. |

Provider tokens can be delivered as API bearer tokens or through a same-origin token cookie. Hosted UI providers still need their normal sign-in/callback flow; this adapter is the server-side verification boundary that keeps RevAssist business logic independent from provider SDK details.

## Provider Recommendation

Recommended first provider: Clerk through the Vercel Marketplace. It gives the fastest path to hosted sign-in UI, organization support, Vercel env provisioning, and Next.js middleware. Descope is a good alternative for passwordless workflow-heavy auth. Auth0 is the stronger option when enterprise SSO/SAML is the primary product requirement.

The adapter intentionally does not hardwire any one provider. That keeps the portfolio app deployable today and makes the architecture discussion stronger: provider-specific login, organization sync, and webhooks stay at the edge, while core SaaS workflows consume one internal claim contract.

## Claim Contract

Keep the app-level contract provider-agnostic:

| RevAssist claim | Provider source | Used by |
| --- | --- | --- |
| `sessionId` | `revassist_session_id`, `sid`, `session_id`, or `jti` | Audit logs, traceability |
| `userId` | JWT `sub` | Rate limits, audit actor, run ownership |
| `dealerId` | `revassist_dealer_id`, namespaced dealer claim, `dealer_id`, `org_id`, `organization_id`, or `tenant_id` | Tenant isolation, history queries, rate limits |
| `role` | `revassist_role`, namespaced role claim, `role`, `org_role`, or `organization_role` | Future authorization checks |
| `name` | `name`, `preferred_username`, `email`, or given/family name | Client shell, audit context |
| `dealerName` | `revassist_dealer_name`, namespaced dealer name claim, `dealer_name`, `org_name`, `organization_name`, or `tenant_name` | Client shell, audit context |
| `iat` / `exp` | JWT issued-at and expiration claims | Session freshness |

Provider JWTs without a dealer/org claim are rejected because RevAssist is tenant-scoped software. Dealer and operator identity must never come from client-submitted deal payload fields.

## Hosted Provider Rollout

1. Install the chosen provider through Vercel Marketplace when possible so production and preview env vars are provisioned to the linked project.
2. Configure hosted sign-in/sign-up, callback routes, and middleware for the workbench.
3. Add organization/dealership membership in the provider or a local membership table.
4. Include RevAssist dealer, dealer-name, and role claims in the provider JWT.
5. Set `REVASSIST_AUTH_ISSUER`, `REVASSIST_AUTH_AUDIENCE`, and `REVASSIST_AUTH_JWKS_URL`.
6. If the browser app receives provider tokens through cookies, set `REVASSIST_AUTH_TOKEN_COOKIE`.
7. Validate provider sessions in preview with `REVASSIST_REQUIRE_MANAGED_AUTH=true`.
8. Update smoke tests to sign in through a test user or use a sealed managed-token helper in CI.
9. Add provider webhooks for user/org membership sync and verify webhook signatures.
10. Set `REVASSIST_ALLOW_DEMO_AUTH=false` and promote only after preview validation passes.

## Middleware Shape

Protect these surfaces:

- `/` workbench routes.
- `/api/deals/analyze`
- `/api/deals/history`
- Any future admin, settings, billing, or member-management routes.

Allow these surfaces:

- `/api/health`
- Static assets and Next.js internals.
- Provider sign-in, sign-up, and callback routes.

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
- Demo auth is disabled in managed production environments.
- Provider JWT signatures, issuer, and audience are verified server-side.
- Tenant history queries are filtered by server-owned `dealerId`.
- Rate limits include tenant, user, and client IP dimensions.
- Audit logs record user/dealer IDs but not raw provider tokens.
- Provider webhooks verify signatures.
- Preview and production use separate provider applications or environments.
- Test users cannot access production data.

## Validation Plan

Run the existing suite after auth changes:

```bash
npm audit --omit=dev --audit-level=high
npm run lint
npm run typecheck
npm run test
npm run eval
npm run build
npm run smoke
```

Current targeted tests cover:

- Signed demo session verification.
- Tampered and expired demo token rejection.
- Provider JWT mapping from bearer tokens.
- Provider JWT mapping from configured same-origin cookies.
- Demo-cookie rejection when managed auth is required.

Add hosted-provider tests after sign-in UI lands:

- Unauthenticated API rejection.
- Missing organization membership rejection.
- Role mapping for F&I manager, director, and admin.
- Tenant isolation in history queries.
- CI smoke sign-in path.

## Interview Talking Points

- The demo cookie is a local/portfolio adapter, not the product's trust boundary.
- The app already avoids client-owned tenant identity, so managed auth is an adapter and provider rollout problem rather than a rewrite.
- Keeping `SessionClaims` provider-agnostic prevents auth vendor details from leaking into deal analysis, persistence, rate limits, and audit logging.
- Organization mapping is treated as product data because dealership identity must stay stable across provider changes.
- The production switch fails closed: once managed auth is required, the demo issuer cannot mint usable sessions.
