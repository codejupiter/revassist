import type { DealEvalResult, DealEvalSummary, EvalCategory } from "./scoring";
import type { LiveEvalSnapshot } from "./live";

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

function formatOpenRisks(results: DealEvalResult[], emptyMessage = "- No failing checks in the deterministic baseline.") {
  const failedChecks = results.flatMap((result) =>
    result.checks
      .filter((check) => !check.passed)
      .map((check) => `- ${result.id}: ${check.category}/${check.label} - ${check.detail}`)
  );

  if (failedChecks.length === 0) {
    return emptyMessage;
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

export function formatLiveEvalSnapshotMarkdown(snapshot: LiveEvalSnapshot) {
  const lines = [
    "# RevAssist Pro Live Eval Snapshot",
    "",
    "This report captures provider-backed model behavior for the RevAssist Pro deal-analysis workflow. Unlike the deterministic baseline, this snapshot is expected to be refreshed only when model, prompt, provider, or policy behavior changes.",
    "",
    "## Summary",
    "",
    `- Generated at: ${snapshot.generatedAt}`,
    `- Model: \`${snapshot.model}\``,
    `- Prompt version: \`${snapshot.promptVersion}\``,
    `- Auth mode: ${snapshot.authMode}`,
    `- Pass rate: ${snapshot.summary.passCount}/${snapshot.summary.total}`,
    `- Average score: ${snapshot.summary.averageScore}`,
    `- Lowest score: ${snapshot.summary.minScore}`,
    `- Result: ${formatResultStatus(snapshot.summary.passed)}`,
    "",
    "## Case Coverage",
    "",
    "| Case | Minimum | Score | Result | Latency | Category coverage |",
    "| --- | ---: | ---: | --- | ---: | --- |",
    ...snapshot.results.map(
      (result) =>
        `| ${escapeTableCell(result.id)} | ${result.minScore} | ${result.score} | ${formatResultStatus(
          result.passed
        )} | ${result.latencyMs}ms | ${escapeTableCell(formatCategoryCoverage(result))} |`
    ),
    "",
    "## Open Risks",
    "",
    formatOpenRisks(snapshot.results, "- No failing checks in this live snapshot."),
    "",
    "## Snapshot Policy",
    "",
    "- Keep deterministic evals as the normal CI gate; use this snapshot as model/provider evidence.",
    "- Refresh before enabling live AI by default, changing prompts, changing model routing, or adding jurisdiction-specific compliance expectations.",
    "- Treat any score below the fixture minimum as a launch blocker until the prompt, model, or product rule is adjusted.",
    "- Do not include raw customer data in live eval fixtures; all cases in this suite are synthetic."
  ];

  return lines.join("\n");
}

export function formatSkippedLiveEvalMarkdownReport(model: string, reason: string) {
  return [
    "# RevAssist Pro Live Eval Snapshot",
    "",
    "No provider-backed live snapshot has been captured for this checkout.",
    "",
    "## Status",
    "",
    "- Result: SKIPPED",
    `- Intended model: \`${model}\``,
    `- Reason: ${reason}`,
    "",
    "## How To Refresh",
    "",
    "```bash",
    "vercel env pull .env.local --yes",
    "npm run eval:live:report",
    "```",
    "",
    "Use `npm run eval:live:required` when a missing provider credential should fail the command."
  ].join("\n");
}
