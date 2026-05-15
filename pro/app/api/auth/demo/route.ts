import { NextResponse } from "next/server";
import { buildSessionCookie, createSessionClaims, isDemoSessionAllowed, signSession, toPublicSession } from "@/lib/server/auth";
import { logInfo, requestContext } from "@/lib/server/logging";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isDemoSessionAllowed()) {
    return NextResponse.json({ error: "Demo auth is disabled for this environment." }, { status: 403 });
  }

  const session = createSessionClaims();
  const response = NextResponse.json({ session: toPublicSession(session) });

  response.headers.set("Set-Cookie", buildSessionCookie(signSession(session)));
  logInfo("auth.demo_session.created", {
    ...requestContext(request, "POST /api/auth/demo"),
    dealerId: session.dealerId,
    userId: session.userId,
    role: session.role
  });

  return response;
}
