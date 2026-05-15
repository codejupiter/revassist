import { Output, streamText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildDealPrompt } from "@/lib/deal/prompt";
import { dealOutputSchema, dealRequestSchema, type DealOutput } from "@/lib/deal/schema";
import { getMockDealOutput, getPartialOutputs } from "@/lib/deal/mock";
import { analyzeRateLimiter } from "@/lib/server/rate-limit";
import { getDealRepository } from "@/lib/server/repository";
import { getDemoSession } from "@/lib/server/session";
import { encodeSse } from "@/lib/server/stream-events";

export const runtime = "nodejs";

const DEFAULT_MODEL = "openai/gpt-5.4";
const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 60_000;

function shouldUseLiveAi() {
  return (
    process.env.REVASSIST_AI_MODE === "live" &&
    Boolean(process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY)
  );
}

function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function streamMockOutput(
  controller: ReadableStreamDefaultController<Uint8Array>,
  runId: string,
  notes: string
) {
  const output = getMockDealOutput(notes);
  for (const partial of getPartialOutputs(output)) {
    controller.enqueue(encodeSse({ type: "partial", runId, partial }));
    await sleep(80);
  }
  return output;
}

async function streamLiveOutput(
  controller: ReadableStreamDefaultController<Uint8Array>,
  runId: string,
  request: z.infer<typeof dealRequestSchema>,
  model: string
) {
  const result = streamText({
    model,
    output: Output.object({
      name: "revassist_deal_output",
      description: "Structured F&I workflow output for a powersports deal.",
      schema: dealOutputSchema
    }),
    prompt: buildDealPrompt(request),
    temperature: 0.2
  });

  for await (const partial of result.partialOutputStream) {
    controller.enqueue(encodeSse({ type: "partial", runId, partial }));
  }

  const output = await result.output;
  return dealOutputSchema.parse(output);
}

export async function POST(request: Request) {
  const session = getDemoSession(request.headers);
  const ip = getClientIp(request);
  const rateKey = `analyze:${session.dealerId}:${session.userId}:${ip}`;
  const rate = analyzeRateLimiter.check(rateKey, RATE_LIMIT, RATE_WINDOW_MS);

  if (!rate.allowed) {
    getDealRepository().addAudit({
      runId: "rate_limited",
      type: "deal.run.rate_limited",
      severity: "medium",
      actorId: session.userId,
      dealerId: session.dealerId,
      detail: { ip, resetAt: rate.resetAt }
    });

    return NextResponse.json(
      { error: "Rate limit exceeded", resetAt: rate.resetAt },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Remaining": "0"
        }
      }
    );
  }

  const payload = dealRequestSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid deal request", issues: payload.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const body = {
    ...payload.data,
    dealerId: payload.data.dealerId || session.dealerId,
    operatorId: payload.data.operatorId || session.userId
  };
  const live = shouldUseLiveAi();
  const model = live ? process.env.REVASSIST_MODEL ?? DEFAULT_MODEL : "revassist-mock-v1";
  const repository = getDealRepository();
  const run = repository.createRun({
    dealerId: body.dealerId,
    operatorId: body.operatorId,
    notes: body.notes,
    model
  });
  const startedAt = performance.now();

  repository.addAudit({
    runId: run.id,
    type: "deal.run.created",
    severity: "low",
    actorId: body.operatorId,
    dealerId: body.dealerId,
    detail: { model, mode: live ? "live" : "mock" }
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encodeSse({ type: "start", runId: run.id, model, mode: live ? "live" : "mock" }));
      repository.markStreaming(run.id);

      try {
        const output: DealOutput = live
          ? await streamLiveOutput(controller, run.id, body, model)
          : await streamMockOutput(controller, run.id, body.notes);
        const latencyMs = Math.round(performance.now() - startedAt);

        repository.completeRun(run.id, output, latencyMs);
        repository.addAudit({
          runId: run.id,
          type: "deal.run.completed",
          severity: output.compliance.some((flag) => flag.severity === "block") ? "medium" : "low",
          actorId: body.operatorId,
          dealerId: body.dealerId,
          detail: { latencyMs, blocks: output.compliance.filter((flag) => flag.severity === "block").length }
        });
        controller.enqueue(encodeSse({ type: "final", runId: run.id, output, latencyMs }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to analyze deal.";
        repository.failRun(run.id, message);
        repository.addAudit({
          runId: run.id,
          type: "deal.run.failed",
          severity: "high",
          actorId: body.operatorId,
          dealerId: body.dealerId,
          detail: { message }
        });
        controller.enqueue(encodeSse({ type: "error", runId: run.id, message }));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "X-RateLimit-Remaining": String(rate.remaining)
    }
  });
}
