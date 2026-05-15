import { NextResponse } from "next/server";
import { getDealRepository } from "@/lib/server/repository";
import { getDemoSession } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = getDemoSession(request.headers);
  const repository = getDealRepository();

  return NextResponse.json({
    runs: repository.listRuns(session.dealerId),
    auditEvents: repository.listAuditEvents(session.dealerId)
  });
}
