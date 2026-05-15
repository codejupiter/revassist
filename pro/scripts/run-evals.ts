import { runDealEvalSuite, summarizeEvalResults } from "../lib/evals/scoring";

const args = new Set(process.argv.slice(2));
const results = runDealEvalSuite();
const summary = summarizeEvalResults(results);

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
