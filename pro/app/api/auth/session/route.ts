import { NextResponse } from "next/server";
import { buildExpiredSessionCookie, getSessionFromRequest, toPublicSession } from "@/lib/server/auth";
import { logInfo, requestContext } from "@/lib/server/logging";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ session: null });
  }

  logInfo("auth.session.read", {
    ...requestContext(request, "GET /api/auth/session"),
    dealerId: session.dealerId,
    userId: session.userId
  });

  return NextResponse.json({ session: toPublicSession(session) });
}

export async function DELETE(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", buildExpiredSessionCookie());
  logInfo("auth.session.deleted", requestContext(request, "DELETE /api/auth/session"));
  return response;
}
