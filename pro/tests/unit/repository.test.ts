import { describe, expect, it } from "vitest";
import { getMockDealOutput } from "@/lib/deal/mock";
import { MemoryDealRepository } from "@/lib/server/repository";

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
});
