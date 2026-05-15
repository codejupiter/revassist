import { auditEventSchema, dealRunSchema, type AuditEvent, type DealOutput, type DealRun } from "@/lib/deal/schema";
import { createId, hashInput, previewInput } from "./ids";
import { PROMPT_VERSION } from "@/lib/deal/prompt";
import { getSql, hasDatabaseUrl } from "./db";

type CreateRunInput = {
  dealerId: string;
  operatorId: string;
  notes: string;
  model: string;
};

type MaybePromise<T> = T | Promise<T>;

export type DealRepository = {
  createRun(input: CreateRunInput): MaybePromise<DealRun>;
  markStreaming(runId: string): MaybePromise<void>;
  completeRun(runId: string, output: DealOutput, latencyMs: number): MaybePromise<void>;
  failRun(runId: string, error: string): MaybePromise<void>;
  addAudit(event: Omit<AuditEvent, "id" | "createdAt">): MaybePromise<AuditEvent>;
  listRuns(dealerId: string, limit?: number): MaybePromise<DealRun[]>;
  listAuditEvents(dealerId: string, limit?: number): MaybePromise<AuditEvent[]>;
  clear(): MaybePromise<void>;
};

export class MemoryDealRepository implements DealRepository {
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

type DealRunRow = {
  id: string;
  status: DealRun["status"];
  created_at: string | Date;
  completed_at: string | Date | null;
  dealer_id: string;
  operator_id: string;
  input_hash: string;
  input_preview: string;
  model: string;
  prompt_version: string;
  latency_ms: number | null;
  output: unknown;
  error: string | null;
};

type AuditEventRow = {
  id: string;
  run_id: string;
  type: AuditEvent["type"];
  severity: AuditEvent["severity"];
  created_at: string | Date;
  actor_id: string;
  dealer_id: string;
  detail: unknown;
};

function toIsoString(value: string | Date | null | undefined) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function parseJsonValue(value: unknown) {
  if (!value) return undefined;
  if (typeof value === "string") {
    return JSON.parse(value);
  }
  return value;
}

export function mapDealRunRow(row: DealRunRow) {
  return dealRunSchema.parse({
    id: row.id,
    status: row.status,
    createdAt: toIsoString(row.created_at),
    completedAt: toIsoString(row.completed_at),
    dealerId: row.dealer_id,
    operatorId: row.operator_id,
    inputHash: row.input_hash,
    inputPreview: row.input_preview,
    model: row.model,
    promptVersion: row.prompt_version,
    latencyMs: row.latency_ms ?? undefined,
    output: parseJsonValue(row.output),
    error: row.error ?? undefined
  });
}

export function mapAuditEventRow(row: AuditEventRow) {
  return auditEventSchema.parse({
    id: row.id,
    runId: row.run_id,
    type: row.type,
    severity: row.severity,
    createdAt: toIsoString(row.created_at),
    actorId: row.actor_id,
    dealerId: row.dealer_id,
    detail: parseJsonValue(row.detail) ?? {}
  });
}

export class PostgresDealRepository implements DealRepository {
  async createRun(input: CreateRunInput) {
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

    const sql = getSql();
    await sql`
      INSERT INTO revassist_deal_runs (
        id, status, created_at, dealer_id, operator_id, input_hash, input_preview, model, prompt_version
      ) VALUES (
        ${run.id}, ${run.status}, ${run.createdAt}, ${run.dealerId}, ${run.operatorId},
        ${run.inputHash}, ${run.inputPreview}, ${run.model}, ${run.promptVersion}
      )
    `;

    return run;
  }

  async markStreaming(runId: string) {
    const sql = getSql();
    await sql`
      UPDATE revassist_deal_runs
      SET status = 'streaming'
      WHERE id = ${runId}
    `;
  }

  async completeRun(runId: string, output: DealOutput, latencyMs: number) {
    const sql = getSql();
    await sql`
      UPDATE revassist_deal_runs
      SET status = 'completed',
          output = ${JSON.stringify(output)}::jsonb,
          latency_ms = ${latencyMs},
          completed_at = ${new Date().toISOString()}
      WHERE id = ${runId}
    `;
  }

  async failRun(runId: string, error: string) {
    const sql = getSql();
    await sql`
      UPDATE revassist_deal_runs
      SET status = 'failed',
          error = ${error},
          completed_at = ${new Date().toISOString()}
      WHERE id = ${runId}
    `;
  }

  async addAudit(event: Omit<AuditEvent, "id" | "createdAt">) {
    const auditEvent: AuditEvent = {
      ...event,
      id: createId("evt"),
      createdAt: new Date().toISOString()
    };

    const sql = getSql();
    await sql`
      INSERT INTO revassist_audit_events (
        id, run_id, type, severity, created_at, actor_id, dealer_id, detail
      ) VALUES (
        ${auditEvent.id}, ${auditEvent.runId}, ${auditEvent.type}, ${auditEvent.severity},
        ${auditEvent.createdAt}, ${auditEvent.actorId}, ${auditEvent.dealerId},
        ${JSON.stringify(auditEvent.detail)}::jsonb
      )
    `;

    return auditEvent;
  }

  async listRuns(dealerId: string, limit = 12) {
    const sql = getSql();
    const rows = (await sql`
      SELECT
        id, status, created_at, completed_at, dealer_id, operator_id, input_hash,
        input_preview, model, prompt_version, latency_ms, output, error
      FROM revassist_deal_runs
      WHERE dealer_id = ${dealerId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `) as DealRunRow[];

    return rows.map(mapDealRunRow);
  }

  async listAuditEvents(dealerId: string, limit = 20) {
    const sql = getSql();
    const rows = (await sql`
      SELECT id, run_id, type, severity, created_at, actor_id, dealer_id, detail
      FROM revassist_audit_events
      WHERE dealer_id = ${dealerId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `) as AuditEventRow[];

    return rows.map(mapAuditEventRow);
  }

  async clear() {
    const sql = getSql();
    await sql`DELETE FROM revassist_audit_events`;
    await sql`DELETE FROM revassist_deal_runs`;
  }
}

let repository: DealRepository | null = null;
let repositoryMode: "memory" | "postgres" | null = null;

export function getDealRepository() {
  const mode = hasDatabaseUrl() ? "postgres" : "memory";

  if (mode === "memory" && process.env.REVASSIST_REQUIRE_DATABASE === "true") {
    throw new Error("DATABASE_URL is required when REVASSIST_REQUIRE_DATABASE=true.");
  }

  if (!repository || repositoryMode !== mode) {
    repository = mode === "postgres" ? new PostgresDealRepository() : new MemoryDealRepository();
    repositoryMode = mode;
  }

  return repository;
}

export function resetDealRepositoryForTests() {
  repository = null;
  repositoryMode = null;
}
