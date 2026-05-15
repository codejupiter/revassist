import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { DEAL_EVAL_CASES } from "../lib/evals/fixtures";
import {
  getLiveEvalAuthMode,
  getLiveEvalModel,
  isLiveProviderSetupError,
  runLiveEvalSnapshot,
  summarizeLiveProviderSetupError
} from "../lib/evals/live";
import { formatLiveEvalSnapshotMarkdown, formatSkippedLiveEvalMarkdownReport } from "../lib/evals/report";

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);

function getArgValue(name: string) {
  const equalsArg = rawArgs.find((arg) => arg.startsWith(`${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 1);

  const index = rawArgs.indexOf(name);
  if (index === -1) return null;

  return rawArgs[index + 1] ?? null;
}

async function loadLocalEnv(path = ".env.local") {
  let contents = "";

  try {
    contents = await readFile(path, "utf8");
  } catch {
    return;
  }

  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1).replace(/^["']|["']$/g, "");
    process.env[key] ??= value;
  }
}

async function writeReport(reportPath: string, report: string) {
  const absoluteReportPath = resolve(reportPath);
  await mkdir(dirname(absoluteReportPath), { recursive: true });
  await writeFile(absoluteReportPath, `${report}\n`);
}

await loadLocalEnv();

const model = getArgValue("--model") ?? getLiveEvalModel();
const reportPath = getArgValue("--report");
const requireLive = args.has("--require-live");
const limitValue = getArgValue("--limit");
const parsedLimit = limitValue ? Number.parseInt(limitValue, 10) : DEAL_EVAL_CASES.length;
const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : DEAL_EVAL_CASES.length;
const fixtures = DEAL_EVAL_CASES.slice(0, limit);
const authMode = getLiveEvalAuthMode();

if (!authMode) {
  const reason = "Missing VERCEL_OIDC_TOKEN, AI_GATEWAY_API_KEY, or OPENAI_API_KEY.";

  if (reportPath) {
    await writeReport(reportPath, formatSkippedLiveEvalMarkdownReport(model, reason));
    console.log(`Wrote skipped live eval report to ${reportPath}`);
  }

  console.log(`Live eval snapshot skipped: ${reason}`);
  if (requireLive) process.exitCode = 1;
} else {
  const snapshot = await runLiveEvalSnapshot(fixtures, model);
  const providerSetupError = snapshot.results.find((result) => result.error && isLiveProviderSetupError(result.error));

  if (providerSetupError?.error && !requireLive) {
    const reason = summarizeLiveProviderSetupError(providerSetupError.error);
    if (reportPath) {
      await writeReport(reportPath, formatSkippedLiveEvalMarkdownReport(model, reason));
      console.log(`Wrote skipped live eval report to ${reportPath}`);
    }
    console.log(`Live eval snapshot skipped: ${reason}`);
  } else {
    if (reportPath) {
      await writeReport(reportPath, formatLiveEvalSnapshotMarkdown(snapshot));
      console.log(`Wrote live eval snapshot to ${reportPath}`);
    }

    if (args.has("--json")) {
      console.log(JSON.stringify(snapshot, null, 2));
    } else {
      console.log("RevAssist Pro live eval snapshot");
      console.log(`Model: ${snapshot.model}`);
      console.log(`Auth mode: ${snapshot.authMode}`);
      console.log(`Pass rate: ${snapshot.summary.passCount}/${snapshot.summary.total}`);
      console.log(`Average score: ${snapshot.summary.averageScore}`);
      console.log(`Lowest score: ${snapshot.summary.minScore}`);
      console.log("");
      console.log("Case                                      Score  Latency  Result");
      console.log("----------------------------------------------------------------");

      for (const result of snapshot.results) {
        const status = result.passed ? "PASS" : "FAIL";
        console.log(`${result.id.padEnd(42)} ${String(result.score).padStart(5)}  ${String(result.latencyMs).padStart(6)}ms  ${status}`);

        if (!result.passed || args.has("--verbose")) {
          for (const check of result.checks) {
            if (check.passed && !args.has("--verbose")) continue;
            console.log(`  - ${check.category}/${check.label}: ${check.points}/${check.maxPoints} ${check.detail}`);
          }
        }

        if (result.error) {
          console.log(`  - error: ${result.error}`);
        }
      }
    }

    if (!snapshot.summary.passed) {
      process.exitCode = 1;
    }
  }
}
