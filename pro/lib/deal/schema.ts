import { z } from "zod";

export const complianceSeveritySchema = z.enum(["info", "warn", "block"]);

export const dealRequestSchema = z.object({
  notes: z
    .string()
    .trim()
    .min(24, "Add enough deal context for a useful recommendation.")
    .max(4000, "Deal notes must stay under 4,000 characters."),
  dealerId: z.string().trim().min(1).max(80).default("demo-powersports"),
  operatorId: z.string().trim().min(1).max(80).default("demo-fi-manager"),
  channel: z.enum(["deal-desk", "voice", "crm-import"]).default("deal-desk")
});

export const addonSchema = z.object({
  name: z.string().min(2).max(80),
  rationale: z.string().min(12).max(320),
  price_range: z.string().min(3).max(40)
});

export const complianceFlagSchema = z.object({
  flag: z.string().min(8).max(280),
  severity: complianceSeveritySchema
});

export const dealOutputSchema = z.object({
  summary: z.string().min(24).max(800),
  addons: z.array(addonSchema).length(3),
  compliance: z.array(complianceFlagSchema).min(1).max(5),
  follow_up_sms: z.string().min(24).max(320)
});

export const auditEventSchema = z.object({
  id: z.string(),
  runId: z.string(),
  type: z.enum([
    "deal.run.created",
    "deal.run.partial",
    "deal.run.completed",
    "deal.run.failed",
    "deal.run.rate_limited",
    "deal.output.copied"
  ]),
  severity: z.enum(["low", "medium", "high"]),
  createdAt: z.string(),
  actorId: z.string(),
  dealerId: z.string(),
  detail: z.record(z.string(), z.unknown()).default({})
});

export const dealRunSchema = z.object({
  id: z.string(),
  status: z.enum(["queued", "streaming", "completed", "failed"]),
  createdAt: z.string(),
  completedAt: z.string().optional(),
  dealerId: z.string(),
  operatorId: z.string(),
  inputHash: z.string(),
  inputPreview: z.string(),
  model: z.string(),
  promptVersion: z.string(),
  latencyMs: z.number().optional(),
  output: dealOutputSchema.optional(),
  error: z.string().optional()
});

export type DealRequest = z.infer<typeof dealRequestSchema>;
export type DealOutput = z.infer<typeof dealOutputSchema>;
export type DealRun = z.infer<typeof dealRunSchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
export type ComplianceSeverity = z.infer<typeof complianceSeveritySchema>;
