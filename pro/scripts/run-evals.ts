import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { formatEvalMarkdownReport } from "../lib/evals/report";
import { runDealEvalSuite, summarizeEvalResults } from "../lib/evals/scoring";

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const results = runDealEvalSuite();
const summary = summarizeEvalResults(results);

function getArgValue(name: string) {
  const equalsArg = rawArgs.find((arg) => arg.startsWith(`${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 1);

  const index = rawArgs.indexOf(name);
  if (index === -1) return null;

  return rawArgs[index + 1] ?? null;
}

const reportPath = getArgValue("--report");

if (reportPath) {
  const absoluteReportPath = resolve(reportPath);
  await mkdir(dirname(absoluteReportPath), { recursive: true });
  await writeFile(
    absoluteReportPath,
    `${formatEvalMarkdownReport(summary, results, {
      refreshCommand: "npm run eval:report"
    })}\n`
  );
  console.log(`Wrote eval report to ${reportPath}`);
}

if (args.has("--json")) {
  console.log(JSON.stringify({ summary, results }, null, 2));
} else {
  console.log("RevAssist Pro eval suite");
  console.log(`Pass rate: ${summary.passCount}/${summary.total}`);
  console.log(`Average score: ${summary.averageScore}`);
  console.log(`Lowest score: ${summary.minScore}`);
  console.log("");
  console.log("Case                                      Score  Result");
  console.log("-------------------------------------------------------");

  for (const result of results) {
    const status = result.passed ? "PASS" : "FAIL";
    console.log(`${result.id.padEnd(42)} ${String(result.score).padStart(5)}  ${status}`);

    if (!result.passed || args.has("--verbose")) {
      for (const check of result.checks) {
        if (check.passed && !args.has("--verbose")) continue;
        console.log(`  - ${check.category}/${check.label}: ${check.points}/${check.maxPoints} ${check.detail}`);
      }
    }
  }
}

if (!summary.passed) {
  process.exitCode = 1;
}
