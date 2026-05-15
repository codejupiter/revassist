import { describe, expect, it } from "vitest";
import {
  SESSION_COOKIE,
  buildSessionCookie,
  createSessionClaims,
  getSessionFromRequest,
  signSession,
  toPublicSession,
  verifySessionToken
} from "@/lib/server/auth";

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

  it("reads signed sessions from cookie headers", () => {
    const claims = createSessionClaims({ userId: "ava" });
    const token = signSession(claims);
    const cookie = buildSessionCookie(token);
    const request = new Request("http://localhost/api/deals/history", {
      headers: {
        cookie: `${SESSION_COOKIE}=ignored; ${cookie.split(";")[0]}`
      }
    });

    expect(getSessionFromRequest(request)?.userId).toBe("ava");
  });
});
