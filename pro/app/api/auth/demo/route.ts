import { NextResponse } from "next/server";
import { buildSessionCookie, createSessionClaims, signSession, toPublicSession } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST() {
  const session = createSessionClaims();
  const response = NextResponse.json({ session: toPublicSession(session) });

  response.headers.set("Set-Cookie", buildSessionCookie(signSession(session)));
  return response;
}
