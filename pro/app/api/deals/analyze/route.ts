import { Output, streamText } from "ai";
import { NextResponse } from "next/server";
import { buildDealPrompt } from "@/lib/deal/prompt";
import { clientDealRequestSchema, dealOutputSchema, type DealOutput, type DealRequest } from "@/lib/deal/schema";
import { getMockDealOutput, getPartialOutputs } from "@/lib/deal/mock";
import { analyzeRateLimiter } from "@/lib/server/rate-limit";
import { getDealRepository } from "@/lib/server/repository";
import { getSessionFromRequest } from "@/lib/server/auth";
import { encodeSse, type DealStreamEvent } from "@/lib/server/stream-events";
import { logError, logInfo, logWarn, requestContext } from "@/lib/server/logging";

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
  send: (event: DealStreamEvent) => boolean,
  runId: string,
  notes: string
) {
  const output = getMockDealOutput(notes);
  for (const partial of getPartialOutputs(output)) {
    if (!send({ type: "partial", runId, partial })) break;
    await sleep(80);
  }
  return output;
}

async function streamLiveOutput(
  send: (event: DealStreamEvent) => boolean,
  runId: string,
  request: DealRequest,
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
    if (!send({ type: "partial", runId, partial })) break;
  }

  const output = await result.output;
  return dealOutputSchema.parse(output);
}

function isClosedStreamError(error: unknown) {
  return error instanceof Error && /controller is already closed|invalid state/i.test(error.message);
}

export async function POST(request: Request) {
  const context = requestContext(request, "POST /api/deals/analyze");
  const session = getSessionFromRequest(request);

  if (!session) {
    logWarn("deals.analyze.unauthorized", context);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateKey = `analyze:${session.dealerId}:${session.userId}:${ip}`;
  const rate = await analyzeRateLimiter.check(rateKey, RATE_LIMIT, RATE_WINDOW_MS).catch(() => null);

  if (!rate) {
    logError("deals.analyze.rate_limit_unavailable", {
      ...context,
      dealerId: session.dealerId,
      userId: session.userId
    });
    return NextResponse.json({ error: "Rate limit service unavailable" }, { status: 503 });
  }

  if (!rate.allowed) {
    logWarn("deals.analyze.rate_limited", {
      ...context,
      dealerId: session.dealerId,
      userId: session.userId,
      store: rate.store,
      resetAt: rate.resetAt
    });
    await getDealRepository().addAudit({
      runId: "rate_limited",
      type: "deal.run.rate_limited",
      severity: "medium",
      actorId: session.userId,
      dealerId: session.dealerId,
      detail: { ip, resetAt: rate.resetAt, store: rate.store }
    });

    return NextResponse.json(
      { error: "Rate limit exceeded", resetAt: rate.resetAt },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rate.resetAt),
          "X-RateLimit-Store": rate.store
        }
      }
    );
  }

  const payload = clientDealRequestSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    logWarn("deals.analyze.invalid_request", {
      ...context,
      dealerId: session.dealerId,
      userId: session.userId,
      issues: Object.keys(payload.error.flatten().fieldErrors).join(",")
    });
    return NextResponse.json(
      { error: "Invalid deal request", issues: payload.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const body: DealRequest = {
    ...payload.data,
    dealerId: session.dealerId,
    operatorId: session.userId
  };
  const live = shouldUseLiveAi();
  const model = live ? process.env.REVASSIST_MODEL ?? DEFAULT_MODEL : "revassist-mock-v1";
  const repository = getDealRepository();
  const run = await repository.createRun({
    dealerId: body.dealerId,
    operatorId: body.operatorId,
    notes: body.notes,
    model
  });
  const startedAt = performance.now();

  logInfo("deals.analyze.started", {
    ...context,
    runId: run.id,
    dealerId: body.dealerId,
    userId: body.operatorId,
    mode: live ? "live" : "mock",
    model,
    rateLimitStore: rate.store,
    rateLimitRemaining: rate.remaining
  });

  await repository.addAudit({
    runId: run.id,
    type: "deal.run.created",
    severity: "low",
    actorId: body.operatorId,
    dealerId: body.dealerId,
    detail: { model, mode: live ? "live" : "mock" }
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let streamClosed = false;
      const send = (event: DealStreamEvent) => {
        if (streamClosed) return false;

        try {
          controller.enqueue(encodeSse(event));
          return true;
        } catch (error) {
          if (!isClosedStreamError(error)) throw error;
          streamClosed = true;
          return false;
        }
      };
      const closeStream = () => {
        if (streamClosed) return;

        try {
          controller.close();
        } catch (error) {
          if (!isClosedStreamError(error)) throw error;
        } finally {
          streamClosed = true;
        }
      };

      send({ type: "start", runId: run.id, model, mode: live ? "live" : "mock" });
      await repository.markStreaming(run.id);

      try {
        const output: DealOutput = live
          ? await streamLiveOutput(send, run.id, body, model)
          : await streamMockOutput(send, run.id, body.notes);
        const latencyMs = Math.round(performance.now() - startedAt);

        await repository.completeRun(run.id, output, latencyMs);
        await repository.addAudit({
          runId: run.id,
          type: "deal.run.completed",
          severity: output.compliance.some((flag) => flag.severity === "block") ? "medium" : "low",
          actorId: body.operatorId,
          dealerId: body.dealerId,
          detail: { latencyMs, blocks: output.compliance.filter((flag) => flag.severity === "block").length }
        });
        logInfo("deals.analyze.completed", {
          ...context,
          runId: run.id,
          dealerId: body.dealerId,
          userId: body.operatorId,
          mode: live ? "live" : "mock",
          model,
          latencyMs,
          complianceBlocks: output.compliance.filter((flag) => flag.severity === "block").length
        });
        send({ type: "final", runId: run.id, output, latencyMs });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to analyze deal.";
        await repository.failRun(run.id, message);
        await repository.addAudit({
          runId: run.id,
          type: "deal.run.failed",
          severity: "high",
          actorId: body.operatorId,
          dealerId: body.dealerId,
          detail: { message }
        });
        logError("deals.analyze.failed", {
          ...context,
          runId: run.id,
          dealerId: body.dealerId,
          userId: body.operatorId,
          mode: live ? "live" : "mock",
          model,
          error: message
        });
        send({ type: "error", runId: run.id, message });
      } finally {
        closeStream();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "X-RateLimit-Remaining": String(rate.remaining),
      "X-RateLimit-Reset": String(rate.resetAt),
      "X-RateLimit-Store": rate.store
    }
  });
}
