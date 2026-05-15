import { NextResponse } from "next/server";
import { getDealRepository } from "@/lib/server/repository";
import { getSessionFromRequest } from "@/lib/server/auth";
import { logInfo, logWarn, requestContext } from "@/lib/server/logging";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = requestContext(request, "GET /api/deals/history");
  const session = await getSessionFromRequest(request);

  if (!session) {
    logWarn("deals.history.unauthorized", context);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repository = getDealRepository();
  const runs = await repository.listRuns(session.dealerId);
  const auditEvents = await repository.listAuditEvents(session.dealerId);

  logInfo("deals.history.read", {
    ...context,
    dealerId: session.dealerId,
    userId: session.userId,
    runs: runs.length,
    auditEvents: auditEvents.length
  });

  return NextResponse.json({
    runs,
    auditEvents
  });
}
