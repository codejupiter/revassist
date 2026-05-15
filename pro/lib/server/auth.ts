import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const SESSION_COOKIE = "revassist_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

export const sessionRoleSchema = z.enum(["fi_manager", "director", "admin"]);

export const sessionClaimsSchema = z.object({
  sessionId: z.string().min(8),
  userId: z.string().min(2).max(80),
  dealerId: z.string().min(2).max(80),
  role: sessionRoleSchema,
  name: z.string().min(2).max(120),
  dealerName: z.string().min(2).max(160),
  iat: z.number().int().positive(),
  exp: z.number().int().positive()
});

export type SessionClaims = z.infer<typeof sessionClaimsSchema>;
export type PublicSession = Omit<SessionClaims, "iat" | "exp"> & {
  expiresAt: string;
};

function getSigningSecret() {
  const secret = process.env.REVASSIST_SESSION_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("REVASSIST_SESSION_SECRET is required in production.");
  }

  return "revassist-pro-local-session-secret";
}

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function signPayload(payload: string) {
  return createHmac("sha256", getSigningSecret()).update(payload).digest("base64url");
}

function parseCookies(header: string | null) {
  const cookies = new Map<string, string>();
  if (!header) return cookies;

  for (const item of header.split(";")) {
    const index = item.indexOf("=");
    if (index === -1) continue;

    const key = item.slice(0, index).trim();
    const value = item.slice(index + 1).trim();
    if (!key) continue;

    try {
      cookies.set(key, decodeURIComponent(value));
    } catch {
      cookies.set(key, value);
    }
  }

  return cookies;
}

export function createSessionClaims(overrides: Partial<SessionClaims> = {}): SessionClaims {
  const issuedAt = overrides.iat ?? Math.floor(Date.now() / 1000);

  return sessionClaimsSchema.parse({
    sessionId: overrides.sessionId ?? randomUUID(),
    userId: overrides.userId ?? "fi-manager-ava",
    dealerId: overrides.dealerId ?? "sun-valley-powersports",
    role: overrides.role ?? "fi_manager",
    name: overrides.name ?? "Ava Martinez",
    dealerName: overrides.dealerName ?? "Sun Valley Powersports",
    iat: issuedAt,
    exp: overrides.exp ?? issuedAt + SESSION_TTL_SECONDS
  });
}

export function signSession(claims: SessionClaims) {
  const payload = toBase64Url(JSON.stringify(sessionClaimsSchema.parse(claims)));
  return `${payload}.${signPayload(payload)}`;
}

export function verifySessionToken(token: string | null | undefined): SessionClaims | null {
  if (!token) return null;

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;

  try {
    const expectedSignature = signPayload(payload);
    const actual = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return null;
    }

    const claims = sessionClaimsSchema.parse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
    if (claims.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return claims;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: Request) {
  return verifySessionToken(parseCookies(request.headers.get("cookie")).get(SESSION_COOKIE));
}

export function toPublicSession(session: SessionClaims): PublicSession {
  return {
    sessionId: session.sessionId,
    userId: session.userId,
    dealerId: session.dealerId,
    role: session.role,
    name: session.name,
    dealerName: session.dealerName,
    expiresAt: new Date(session.exp * 1000).toISOString()
  };
}

export function buildSessionCookie(token: string, maxAgeSeconds = SESSION_TTL_SECONDS) {
  const attributes = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`
  ];

  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

export function buildExpiredSessionCookie() {
  return [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    process.env.NODE_ENV === "production" ? "Secure" : null
  ]
    .filter(Boolean)
    .join("; ");
}
