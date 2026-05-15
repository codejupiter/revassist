import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { afterEach, describe, expect, it } from "vitest";
import {
  SESSION_COOKIE,
  buildSessionCookie,
  createSessionClaims,
  getSessionFromRequest,
  isDemoSessionAllowed,
  signSession,
  toPublicSession,
  verifySessionToken
} from "@/lib/server/auth";

const AUTH_ENV_KEYS = [
  "REVASSIST_ALLOW_DEMO_AUTH",
  "REVASSIST_REQUIRE_MANAGED_AUTH",
  "REVASSIST_AUTH_ISSUER",
  "REVASSIST_AUTH_AUDIENCE",
  "REVASSIST_AUTH_JWKS_JSON",
  "REVASSIST_AUTH_JWKS_URL",
  "REVASSIST_AUTH_TOKEN_COOKIE"
] as const;
const originalAuthEnv = Object.fromEntries(AUTH_ENV_KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of AUTH_ENV_KEYS) {
    const original = originalAuthEnv[key];
    if (original === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original;
    }
  }
});

type ManagedJwtClaims = Record<string, string | undefined>;

async function createManagedJwt(claims: ManagedJwtClaims = {
  revassist_dealer_id: "mesa-powersports",
  revassist_dealer_name: "Mesa Powersports",
  revassist_role: "director",
  name: "Jordan Lee"
}) {
  const issuer = "https://auth.revassist.test";
  const audience = "revassist-pro";
  const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });
  const publicJwk = await exportJWK(publicKey);
  const kid = "revassist-managed-test-key";
  const now = Math.floor(Date.now() / 1000);

  process.env.REVASSIST_AUTH_ISSUER = issuer;
  process.env.REVASSIST_AUTH_AUDIENCE = audience;
  process.env.REVASSIST_AUTH_JWKS_JSON = JSON.stringify({
    keys: [{ ...publicJwk, kid, alg: "RS256", use: "sig" }]
  });

  return new SignJWT(Object.fromEntries(Object.entries(claims).filter(([, value]) => value !== undefined)))
    .setProtectedHeader({ alg: "RS256", kid })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject("provider-user-123")
    .setJti("provider-session-456")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);
}

describe("session auth", () => {
  it("signs and verifies session claims", () => {
    const claims = createSessionClaims({ userId: "manager", dealerId: "demo-dealer" });
    const token = signSession(claims);
    const verified = verifySessionToken(token);

    expect(verified?.userId).toBe("manager");
    expect(verified?.dealerId).toBe("demo-dealer");
    expect(toPublicSession(claims).expiresAt).toContain("T");
  });

  it("rejects tampered and expired tokens", () => {
    const valid = signSession(createSessionClaims());
    const expired = signSession(createSessionClaims({ exp: Math.floor(Date.now() / 1000) - 10 }));

    expect(verifySessionToken(`${valid.slice(0, -2)}xx`)).toBeNull();
    expect(verifySessionToken(expired)).toBeNull();
  });

  it("reads signed sessions from cookie headers", async () => {
    const claims = createSessionClaims({ userId: "ava" });
    const token = signSession(claims);
    const cookie = buildSessionCookie(token);
    const request = new Request("http://localhost/api/deals/history", {
      headers: {
        cookie: `${SESSION_COOKIE}=ignored; ${cookie.split(";")[0]}`
      }
    });

    await expect(getSessionFromRequest(request)).resolves.toMatchObject({ userId: "ava" });
  });

  it("maps managed OIDC bearer tokens into session claims", async () => {
    const token = await createManagedJwt();
    const request = new Request("http://localhost/api/deals/history", {
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    await expect(getSessionFromRequest(request)).resolves.toMatchObject({
      sessionId: "provider-session-456",
      userId: "provider-user-123",
      dealerId: "mesa-powersports",
      role: "director",
      name: "Jordan Lee",
      dealerName: "Mesa Powersports"
    });
  });

  it("can read managed tokens from a configured provider cookie", async () => {
    const token = await createManagedJwt();
    process.env.REVASSIST_AUTH_TOKEN_COOKIE = "provider_session";
    const request = new Request("http://localhost/api/deals/history", {
      headers: {
        cookie: `provider_session=${encodeURIComponent(token)}`
      }
    });

    await expect(getSessionFromRequest(request)).resolves.toMatchObject({
      userId: "provider-user-123",
      dealerId: "mesa-powersports"
    });
  });

  it("rejects managed tokens without dealership membership", async () => {
    const token = await createManagedJwt({
      revassist_dealer_id: undefined,
      revassist_dealer_name: "Mesa Powersports",
      revassist_role: "director",
      name: "Jordan Lee"
    });
    const request = new Request("http://localhost/api/deals/history", {
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    await expect(getSessionFromRequest(request)).resolves.toBeNull();
  });

  it("disables demo cookies when managed auth is required", async () => {
    process.env.REVASSIST_REQUIRE_MANAGED_AUTH = "true";
    const claims = createSessionClaims({ userId: "ava" });
    const token = signSession(claims);
    const request = new Request("http://localhost/api/deals/history", {
      headers: {
        cookie: buildSessionCookie(token).split(";")[0]
      }
    });

    expect(isDemoSessionAllowed()).toBe(false);
    await expect(getSessionFromRequest(request)).resolves.toBeNull();
  });
});
