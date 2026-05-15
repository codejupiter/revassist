import type { DealEvalResult, DealEvalSummary, EvalCategory } from "./scoring";

const CATEGORY_LABELS = {
  routing: "Routing",
  schema: "Schema",
  summary: "Summary",
  addons: "Add-ons",
  compliance: "Compliance",
  sms: "SMS"
} satisfies Record<EvalCategory, string>;

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as EvalCategory[];

type EvalReportOptions = {
  title?: string;
  source?: string;
  refreshCommand?: string;
};

function escapeTableCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function formatResultStatus(passed: boolean) {
  return passed ? "PASS" : "FAIL";
}

function formatCategoryCoverage(result: DealEvalResult) {
  return CATEGORY_ORDER.map((category) => {
    const checks = result.checks.filter((check) => check.category === category);
    const points = checks.reduce((total, check) => total + check.points, 0);
    const maxPoints = checks.reduce((total, check) => total + check.maxPoints, 0);

    return `${CATEGORY_LABELS[category]} ${points}/${maxPoints}`;
  }).join("; ");
}

function formatOpenRisks(results: DealEvalResult[]) {
  const failedChecks = results.flatMap((result) =>
    result.checks
      .filter((check) => !check.passed)
      .map((check) => `- ${result.id}: ${check.category}/${check.label} - ${check.detail}`)
  );

  if (failedChecks.length === 0) {
    return "- No failing checks in the deterministic baseline.";
  }

  return failedChecks.join("\n");
}

export function formatEvalMarkdownReport(
  summary: DealEvalSummary,
  results: DealEvalResult[],
  options: EvalReportOptions = {}
) {
  const title = options.title ?? "RevAssist Pro Eval Baseline";
  const source = options.source ?? "Deterministic mock resolver";
  const refreshCommand = options.refreshCommand ?? "npm run eval:report";
  const lines = [
    `# ${title}`,
    "",
    "This report captures the deterministic regression baseline for the RevAssist Pro deal-analysis workflow. It is designed to be readable in GitHub while still mapping directly to the CI eval gate.",
    "",
    "## Summary",
    "",
    `- Source: ${source}`,
    `- Refresh command: \`${refreshCommand}\``,
    `- Pass rate: ${summary.passCount}/${summary.total}`,
    `- Average score: ${summary.averageScore}`,
    `- Lowest score: ${summary.minScore}`,
    `- Result: ${formatResultStatus(summary.passed)}`,
    "",
    "## Case Coverage",
    "",
    "| Case | Minimum | Score | Result | Category coverage |",
    "| --- | ---: | ---: | --- | --- |",
    ...results.map(
      (result) =>
        `| ${escapeTableCell(result.id)} | ${result.minScore} | ${result.score} | ${formatResultStatus(
          result.passed
        )} | ${escapeTableCell(formatCategoryCoverage(result))} |`
    ),
    "",
    "## Open Risks",
    "",
    formatOpenRisks(results),
    "",
    "## Interview Notes",
    "",
    "- The eval suite guards the behaviors most likely to regress when prompts, routing rules, or models change: profile routing, schema validity, sales relevance, compliance coverage, and SMS usefulness.",
    "- The deterministic baseline is intentionally separate from future live-model snapshots so local development and CI stay stable without provider credentials.",
    "- A production rollout should add live-model snapshots per provider/model and compare them against this baseline before changing prompts or model routing."
  ];

  return lines.join("\n");
}
