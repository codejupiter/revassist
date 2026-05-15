import { describe, expect, it } from "vitest";
import { getMockDealOutput } from "@/lib/deal/mock";
import { MemoryDealRepository, mapAuditEventRow, mapDealRunRow } from "@/lib/server/repository";

describe("deal repository", () => {
  it("records run lifecycle and audit events", () => {
    const repository = new MemoryDealRepository();
    const run = repository.createRun({
      dealerId: "demo",
      operatorId: "manager",
      notes: "Customer wants a Polaris RZR with trade equity and family trail use.",
      model: "revassist-mock-v1"
    });

    repository.markStreaming(run.id);
    repository.completeRun(run.id, getMockDealOutput("Polaris RZR"), 1234);
    repository.addAudit({
      runId: run.id,
      type: "deal.run.completed",
      severity: "medium",
      actorId: "manager",
      dealerId: "demo",
      detail: { latencyMs: 1234 }
    });

    expect(repository.listRuns("demo")).toHaveLength(1);
    expect(repository.listRuns("demo")[0]?.status).toBe("completed");
    expect(repository.listAuditEvents("demo")[0]?.type).toBe("deal.run.completed");
  });

  it("maps Postgres rows into public API shapes", () => {
    const output = getMockDealOutput("Yamaha YZF-R1");
    const run = mapDealRunRow({
      id: "run_123",
      status: "completed",
      created_at: new Date("2026-05-14T12:00:00.000Z"),
      completed_at: "2026-05-14T12:00:01.000Z",
      dealer_id: "demo",
      operator_id: "manager",
      input_hash: "hash",
      input_preview: "Customer wants a sportbike",
      model: "revassist-mock-v1",
      prompt_version: "revassist-pro-v1",
      latency_ms: 1000,
      output,
      error: null
    });
    const event = mapAuditEventRow({
      id: "evt_123",
      run_id: run.id,
      type: "deal.run.completed",
      severity: "low",
      created_at: "2026-05-14T12:00:01.000Z",
      actor_id: "manager",
      dealer_id: "demo",
      detail: { latencyMs: 1000 }
    });

    expect(run.output?.summary).toContain("Yamaha");
    expect(event.detail.latencyMs).toBe(1000);
  });
});
