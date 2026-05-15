import type { AuditEvent, DealOutput, DealRun } from "@/lib/deal/schema";
import { createId, hashInput, previewInput } from "./ids";
import { PROMPT_VERSION } from "@/lib/deal/prompt";

type CreateRunInput = {
  dealerId: string;
  operatorId: string;
  notes: string;
  model: string;
};

export class MemoryDealRepository {
  private runs = new Map<string, DealRun>();
  private auditEvents: AuditEvent[] = [];

  createRun(input: CreateRunInput) {
    const run: DealRun = {
      id: createId("run"),
      status: "queued",
      createdAt: new Date().toISOString(),
      dealerId: input.dealerId,
      operatorId: input.operatorId,
      inputHash: hashInput(input.notes),
      inputPreview: previewInput(input.notes),
      model: input.model,
      promptVersion: PROMPT_VERSION
    };

    this.runs.set(run.id, run);
    return run;
  }

  markStreaming(runId: string) {
    this.patchRun(runId, { status: "streaming" });
  }

  completeRun(runId: string, output: DealOutput, latencyMs: number) {
    this.patchRun(runId, {
      status: "completed",
      output,
      latencyMs,
      completedAt: new Date().toISOString()
    });
  }

  failRun(runId: string, error: string) {
    this.patchRun(runId, {
      status: "failed",
      error,
      completedAt: new Date().toISOString()
    });
  }

  addAudit(event: Omit<AuditEvent, "id" | "createdAt">) {
    const auditEvent: AuditEvent = {
      ...event,
      id: createId("evt"),
      createdAt: new Date().toISOString()
    };

    this.auditEvents.unshift(auditEvent);
    this.auditEvents = this.auditEvents.slice(0, 200);
    return auditEvent;
  }

  listRuns(dealerId: string, limit = 12) {
    return Array.from(this.runs.values())
      .filter((run) => run.dealerId === dealerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  listAuditEvents(dealerId: string, limit = 20) {
    return this.auditEvents.filter((event) => event.dealerId === dealerId).slice(0, limit);
  }

  clear() {
    this.runs.clear();
    this.auditEvents = [];
  }

  private patchRun(runId: string, patch: Partial<DealRun>) {
    const run = this.runs.get(runId);
    if (!run) return;
    this.runs.set(runId, { ...run, ...patch });
  }
}

let repository: MemoryDealRepository | null = null;

export function getDealRepository() {
  if (!repository) {
    repository = new MemoryDealRepository();
  }
  return repository;
}
