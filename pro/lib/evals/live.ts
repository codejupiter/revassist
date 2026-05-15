import { generateText, Output } from "ai";
import { buildDealPrompt, PROMPT_VERSION } from "@/lib/deal/prompt";
import { dealOutputSchema, type DealOutput, type DealRequest } from "@/lib/deal/schema";
import { DEAL_EVAL_CASES, type DealEvalCase } from "./fixtures";
import { evaluateDealFixture, summarizeEvalResults, type DealEvalResult, type DealEvalSummary } from "./scoring";

export type LiveEvalAuthMode = "vercel-oidc" | "ai-gateway-key" | "openai-key";

export type LiveEvalCaseResult = DealEvalResult & {
  latencyMs: number;
  error?: string;
};

export type LiveEvalSnapshot = {
  generatedAt: string;
  model: string;
  promptVersion: string;
  authMode: LiveEvalAuthMode;
  summary: DealEvalSummary;
  results: LiveEvalCaseResult[];
};

export function getLiveEvalAuthMode(): LiveEvalAuthMode | null {
  if (process.env.VERCEL_OIDC_TOKEN) return "vercel-oidc";
  if (process.env.AI_GATEWAY_API_KEY) return "ai-gateway-key";
  if (process.env.OPENAI_API_KEY) return "openai-key";
  return null;
}

export function getLiveEvalModel() {
  return process.env.REVASSIST_LIVE_EVAL_MODEL ?? process.env.REVASSIST_MODEL ?? "openai/gpt-5.4";
}

export function isLiveProviderSetupError(error: string) {
  return /credit card|billing|free credits|unauthorized|forbidden|invalid api key|oidc|credentials?/i.test(error);
}

export function summarizeLiveProviderSetupError(error: string) {
  if (/credit card|free credits|billing/i.test(error)) {
    return "Vercel AI Gateway is authenticated, but the team must finish billing/free-credit setup before live model requests can run.";
  }

  if (/oidc|credentials?|unauthorized|forbidden|invalid api key/i.test(error)) {
    return "Live evals need a valid Vercel AI Gateway OIDC token or API key.";
  }

  return "Live provider setup is incomplete.";
}

export function createEvalDealRequest(fixture: DealEvalCase): DealRequest {
  return {
    notes: fixture.notes,
    channel: "deal-desk",
    dealerId: "eval-sun-valley-powersports",
    operatorId: "eval-runner"
  };
}

export async function generateLiveDealOutput(fixture: DealEvalCase, model = getLiveEvalModel()): Promise<DealOutput> {
  const result = await generateText({
    model,
    output: Output.object({
      name: "revassist_deal_output",
      description: "Structured F&I workflow output for a powersports deal.",
      schema: dealOutputSchema
    }),
    prompt: buildDealPrompt(createEvalDealRequest(fixture)),
    temperature: 0.2
  });

  return dealOutputSchema.parse(result.output);
}

function createFailedLiveResult(fixture: DealEvalCase, latencyMs: number, error: string): LiveEvalCaseResult {
  return {
    id: fixture.id,
    title: fixture.title,
    score: 0,
    minScore: fixture.minScore,
    passed: false,
    latencyMs,
    error,
    checks: [
      {
        category: "schema",
        label: "live generation",
        passed: false,
        points: 0,
        maxPoints: 15,
        detail: error
      }
    ]
  };
}

export async function runLiveEvalSnapshot(fixtures = DEAL_EVAL_CASES, model = getLiveEvalModel()): Promise<LiveEvalSnapshot> {
  const authMode = getLiveEvalAuthMode();
  if (!authMode) {
    throw new Error("Live evals require VERCEL_OIDC_TOKEN, AI_GATEWAY_API_KEY, or OPENAI_API_KEY.");
  }

  const results: LiveEvalCaseResult[] = [];

  for (const fixture of fixtures) {
    const startedAt = performance.now();

    try {
      const output = await generateLiveDealOutput(fixture, model);
      const result = evaluateDealFixture(fixture, output);
      results.push({
        ...result,
        latencyMs: Math.round(performance.now() - startedAt)
      });
    } catch (error) {
      results.push(
        createFailedLiveResult(
          fixture,
          Math.round(performance.now() - startedAt),
          error instanceof Error ? error.message : "Live generation failed."
        )
      );
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    model,
    promptVersion: PROMPT_VERSION,
    authMode,
    summary: summarizeEvalResults(results),
    results
  };
}
