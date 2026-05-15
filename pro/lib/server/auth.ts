import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  createLocalJWKSet,
  createRemoteJWKSet,
  jwtVerify,
  type JSONWebKeySet,
  type JWTPayload
} from "jose";
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
type ManagedKeySet = ReturnType<typeof createLocalJWKSet> | ReturnType<typeof createRemoteJWKSet>;
type ManagedAuthConfig = {
  issuer: string;
  audience?: string;
  tokenCookie?: string;
  jwksJson?: string;
  jwksUrl?: string;
};

let managedKeySetCache: { source: string; keySet: ManagedKeySet } | null = null;

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

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function isEnabled(value: string | undefined) {
  return value?.toLowerCase() === "true";
}

export function isDemoSessionAllowed() {
  return process.env.REVASSIST_ALLOW_DEMO_AUTH !== "false" && !isEnabled(process.env.REVASSIST_REQUIRE_MANAGED_AUTH);
}

export function getManagedAuthConfig(): ManagedAuthConfig | null {
  const issuer = readEnv("REVASSIST_AUTH_ISSUER");
  const jwksJson = readEnv("REVASSIST_AUTH_JWKS_JSON");
  const jwksUrl = readEnv("REVASSIST_AUTH_JWKS_URL");

  if (!issuer || (!jwksJson && !jwksUrl)) {
    return null;
  }

  return {
    issuer,
    audience: readEnv("REVASSIST_AUTH_AUDIENCE"),
    tokenCookie: readEnv("REVASSIST_AUTH_TOKEN_COOKIE"),
    jwksJson,
    jwksUrl
  };
}

export function isManagedAuthConfigured() {
  return Boolean(getManagedAuthConfig());
}

function getManagedKeySet(config: ManagedAuthConfig): ManagedKeySet {
  const source = config.jwksJson ? `json:${config.jwksJson}` : `url:${config.jwksUrl}`;
  if (managedKeySetCache?.source === source) {
    return managedKeySetCache.keySet;
  }

  const keySet = config.jwksJson
    ? createLocalJWKSet(JSON.parse(config.jwksJson) as JSONWebKeySet)
    : createRemoteJWKSet(new URL(config.jwksUrl ?? ""));

  managedKeySetCache = { source, keySet };
  return keySet;
}

function getStringClaim(payload: JWTPayload, names: string[]) {
  for (const name of names) {
    const value = payload[name];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function getManagedToken(request: Request, cookies: Map<string, string>, config: ManagedAuthConfig) {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer) return bearer;

  return config.tokenCookie ? cookies.get(config.tokenCookie) ?? null : null;
}

function mapManagedClaims(payload: JWTPayload): SessionClaims | null {
  if (!payload.sub || !payload.exp) {
    return null;
  }

  const dealerId = getStringClaim(payload, [
    "revassist_dealer_id",
    "https://revassist.dev/dealer_id",
    "dealer_id",
    "org_id",
    "organization_id",
    "tenant_id"
  ]);
  if (!dealerId) return null;

  const role = sessionRoleSchema.safeParse(
    getStringClaim(payload, [
      "revassist_role",
      "https://revassist.dev/role",
      "role",
      "org_role",
      "organization_role"
    ]) ?? "fi_manager"
  );
  const issuedAt = typeof payload.iat === "number" ? payload.iat : Math.floor(Date.now() / 1000);
  const sessionId =
    getStringClaim(payload, ["revassist_session_id", "https://revassist.dev/session_id", "sid", "session_id", "jti"]) ??
    `${payload.sub}:${issuedAt}`;
  const profileName = [getStringClaim(payload, ["given_name"]), getStringClaim(payload, ["family_name"])]
    .filter(Boolean)
    .join(" ");
  const name = getStringClaim(payload, ["name", "preferred_username", "email"]) ?? (profileName || payload.sub);
  const dealerName =
    getStringClaim(payload, [
      "revassist_dealer_name",
      "https://revassist.dev/dealer_name",
      "dealer_name",
      "org_name",
      "organization_name",
      "tenant_name"
    ]) ?? dealerId;

  const parsed = sessionClaimsSchema.safeParse({
    sessionId,
    userId: payload.sub,
    dealerId,
    role: role.success ? role.data : "fi_manager",
    name,
    dealerName,
    iat: issuedAt,
    exp: payload.exp
  });

  return parsed.success ? parsed.data : null;
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

export async function verifyManagedSessionToken(token: string | null | undefined): Promise<SessionClaims | null> {
  const config = getManagedAuthConfig();
  if (!token || !config) return null;

  try {
    const { payload } = await jwtVerify(token, getManagedKeySet(config), {
      issuer: config.issuer,
      audience: config.audience
    });
    return mapManagedClaims(payload);
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(request: Request) {
  const cookies = parseCookies(request.headers.get("cookie"));
  const managedConfig = getManagedAuthConfig();

  if (managedConfig) {
    const managedSession = await verifyManagedSessionToken(getManagedToken(request, cookies, managedConfig));
    if (managedSession) return managedSession;
  }

  if (!isDemoSessionAllowed()) {
    return null;
  }

  return verifySessionToken(cookies.get(SESSION_COOKIE));
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
