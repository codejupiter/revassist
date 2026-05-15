import { describe, expect, it } from "vitest";
import { getMockDealOutput } from "@/lib/deal/mock";
import { DEAL_EVAL_CASES } from "@/lib/evals/fixtures";
import { isLiveProviderSetupError, summarizeLiveProviderSetupError } from "@/lib/evals/live";
import { formatEvalMarkdownReport, formatLiveEvalSnapshotMarkdown, formatSkippedLiveEvalMarkdownReport } from "@/lib/evals/report";
import { evaluateDealFixture, runDealEvalSuite, summarizeEvalResults } from "@/lib/evals/scoring";

describe("RevAssist eval suite", () => {
  it("passes deterministic mock outputs against labeled fixtures", () => {
    const results = runDealEvalSuite();
    const summary = summarizeEvalResults(results);

    expect(summary.passed).toBe(true);
    expect(summary.passCount).toBe(DEAL_EVAL_CASES.length);
    expect(summary.averageScore).toBeGreaterThanOrEqual(90);
  });

  it("fails a fixture when compliance coverage is missing", () => {
    const fixture = DEAL_EVAL_CASES[0];
    const output = {
      ...getMockDealOutput(fixture.notes),
      compliance: [
        {
          flag: "Confirm customer phone number before follow-up.",
          severity: "info" as const
        }
      ]
    };
    const result = evaluateDealFixture(fixture, output);

    expect(result.passed).toBe(false);
    expect(result.checks.some((check) => check.category === "compliance" && !check.passed)).toBe(true);
  });

  it("formats a recruiter-readable markdown baseline report", () => {
    const results = runDealEvalSuite();
    const summary = summarizeEvalResults(results);
    const report = formatEvalMarkdownReport(summary, results);

    expect(report).toContain("# RevAssist Pro Eval Baseline");
    expect(report).toContain(`- Pass rate: ${DEAL_EVAL_CASES.length}/${DEAL_EVAL_CASES.length}`);
    expect(report).toContain("| yamaha-first-time-sportbike |");
    expect(report).toContain("The deterministic baseline is intentionally separate from future live-model snapshots");
  });

  it("formats provider-backed live snapshot reports", () => {
    const results = runDealEvalSuite();
    const summary = summarizeEvalResults(results);
    const report = formatLiveEvalSnapshotMarkdown({
      generatedAt: "2026-05-15T00:00:00.000Z",
      model: "openai/gpt-5.4",
      promptVersion: "revassist-pro-v1",
      authMode: "vercel-oidc",
      summary,
      results: results.map((result) => ({ ...result, latencyMs: 1200 }))
    });

    expect(report).toContain("# RevAssist Pro Live Eval Snapshot");
    expect(report).toContain("- Model: `openai/gpt-5.4`");
    expect(report).toContain("| yamaha-first-time-sportbike |");
    expect(report).toContain("Refresh before enabling live AI by default");
  });

  it("formats skipped live snapshot reports", () => {
    const report = formatSkippedLiveEvalMarkdownReport("openai/gpt-5.4", "Missing credentials.");

    expect(report).toContain("- Result: SKIPPED");
    expect(report).toContain("npm run eval:live:required");
  });

  it("classifies provider setup errors separately from model quality failures", () => {
    const billingError = "AI Gateway requires a valid credit card on file to service requests.";
    const qualityError = "Missed expected add-on relevance.";

    expect(isLiveProviderSetupError(billingError)).toBe(true);
    expect(summarizeLiveProviderSetupError(billingError)).toContain("billing/free-credit setup");
    expect(isLiveProviderSetupError(qualityError)).toBe(false);
  });
});
