import { NextResponse } from "next/server";
import { buildExpiredSessionCookie, getSessionFromRequest, toPublicSession } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ session: null });
  }

  return NextResponse.json({ session: toPublicSession(session) });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", buildExpiredSessionCookie());
  return response;
}
