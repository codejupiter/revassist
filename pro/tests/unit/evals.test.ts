import { describe, expect, it } from "vitest";
import { getMockDealOutput } from "@/lib/deal/mock";
import { DEAL_EVAL_CASES } from "@/lib/evals/fixtures";
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
});
