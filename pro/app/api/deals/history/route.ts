import { NextResponse } from "next/server";
import { getDealRepository } from "@/lib/server/repository";
import { getSessionFromRequest } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repository = getDealRepository();

  return NextResponse.json({
    runs: await repository.listRuns(session.dealerId),
    auditEvents: await repository.listAuditEvents(session.dealerId)
  });
}
