import { getMockDealOutput, selectDealProfile } from "@/lib/deal/mock";
import { dealOutputSchema, type DealOutput } from "@/lib/deal/schema";
import { DEAL_EVAL_CASES, type DealEvalCase, type EvalExpectation } from "./fixtures";

export type EvalCategory = "routing" | "schema" | "summary" | "addons" | "compliance" | "sms";

export type EvalCheck = {
  category: EvalCategory;
  label: string;
  passed: boolean;
  points: number;
  maxPoints: number;
  detail: string;
};

export type DealEvalResult = {
  id: string;
  title: string;
  score: number;
  minScore: number;
  passed: boolean;
  checks: EvalCheck[];
};

export type DealEvalSummary = {
  passed: boolean;
  passCount: number;
  total: number;
  averageScore: number;
  minScore: number;
};

type OutputResolver = (notes: string, fixture: DealEvalCase) => DealOutput;

const CATEGORY_WEIGHTS = {
  routing: 10,
  schema: 15,
  summary: 15,
  addons: 25,
  compliance: 25,
  sms: 10
} satisfies Record<EvalCategory, number>;

function normalize(value: string) {
  return value.toLowerCase().replace(/&/g, "and");
}

function matchesExpectation(text: string, expectation: EvalExpectation) {
  const normalized = normalize(text);
  return expectation.anyOf.some((term) => normalized.includes(normalize(term)));
}

function scoreExpectations(
  category: EvalCategory,
  label: string,
  expectations: EvalExpectation[],
  text: string,
  maxPoints: number
): EvalCheck {
  const missed = expectations.filter((expectation) => !matchesExpectation(text, expectation));
  const matched = expectations.length - missed.length;
  const points = expectations.length === 0 ? maxPoints : Math.round((matched / expectations.length) * maxPoints);

  return {
    category,
    label,
    passed: missed.length === 0,
    points,
    maxPoints,
    detail:
      missed.length === 0
        ? `Matched ${matched}/${expectations.length} expectations.`
        : `Missed: ${missed.map((item) => item.label).join(", ")}.`
  };
}

function scoreRequiredSeverities(fixture: DealEvalCase, output: DealOutput): EvalCheck {
  const severities = new Set(output.compliance.map((flag) => flag.severity));
  const missed = fixture.expectations.requiredSeverities.filter((severity) => !severities.has(severity));
  const points =
    fixture.expectations.requiredSeverities.length === 0
      ? 5
      : Math.round(
          ((fixture.expectations.requiredSeverities.length - missed.length) /
            fixture.expectations.requiredSeverities.length) *
            5
        );

  return {
    category: "compliance",
    label: "severity coverage",
    passed: missed.length === 0,
    points,
    maxPoints: 5,
    detail: missed.length === 0 ? "Required severities present." : `Missing severities: ${missed.join(", ")}.`
  };
}

export function evaluateDealFixture(fixture: DealEvalCase, output: DealOutput): DealEvalResult {
  const schemaResult = dealOutputSchema.safeParse(output);

  if (!schemaResult.success) {
    const checks: EvalCheck[] = [
      {
        category: "schema",
        label: "structured output schema",
        passed: false,
        points: 0,
        maxPoints: CATEGORY_WEIGHTS.schema,
        detail: "Output failed dealOutputSchema validation."
      }
    ];

    return {
      id: fixture.id,
      title: fixture.title,
      score: 0,
      minScore: fixture.minScore,
      passed: false,
      checks
    };
  }

  const parsed = schemaResult.data;
  const routedProfile = selectDealProfile(fixture.notes);
  const checks: EvalCheck[] = [
    {
      category: "routing",
      label: "deal profile routing",
      passed: routedProfile === fixture.expectedProfile,
      points: routedProfile === fixture.expectedProfile ? CATEGORY_WEIGHTS.routing : 0,
      maxPoints: CATEGORY_WEIGHTS.routing,
      detail: `Expected ${fixture.expectedProfile}, got ${routedProfile}.`
    },
    {
      category: "schema",
      label: "structured output schema",
      passed: true,
      points: CATEGORY_WEIGHTS.schema,
      maxPoints: CATEGORY_WEIGHTS.schema,
      detail: "Output matches dealOutputSchema."
    },
    scoreExpectations("summary", "summary relevance", fixture.expectations.summary, parsed.summary, CATEGORY_WEIGHTS.summary),
    scoreExpectations(
      "addons",
      "add-on relevance",
      fixture.expectations.addons,
      parsed.addons.map((addon) => `${addon.name} ${addon.rationale}`).join("\n"),
      CATEGORY_WEIGHTS.addons
    ),
    scoreExpectations(
      "compliance",
      "compliance coverage",
      fixture.expectations.compliance,
      parsed.compliance.map((flag) => flag.flag).join("\n"),
      CATEGORY_WEIGHTS.compliance - 5
    ),
    scoreRequiredSeverities(fixture, parsed),
    scoreExpectations("sms", "follow-up usefulness", fixture.expectations.sms, parsed.follow_up_sms, CATEGORY_WEIGHTS.sms)
  ];
  const score = checks.reduce((total, check) => total + check.points, 0);

  return {
    id: fixture.id,
    title: fixture.title,
    score,
    minScore: fixture.minScore,
    passed: score >= fixture.minScore && checks.every((check) => check.passed || check.category !== "schema"),
    checks
  };
}

export function runDealEvalSuite(outputResolver: OutputResolver = (notes) => getMockDealOutput(notes)) {
  return DEAL_EVAL_CASES.map((fixture) => evaluateDealFixture(fixture, outputResolver(fixture.notes, fixture)));
}

export function summarizeEvalResults(results: DealEvalResult[]): DealEvalSummary {
  const passCount = results.filter((result) => result.passed).length;
  const averageScore =
    results.length === 0 ? 0 : Math.round((results.reduce((total, result) => total + result.score, 0) / results.length) * 10) / 10;
  const minScore = results.length === 0 ? 0 : Math.min(...results.map((result) => result.score));

  return {
    passed: passCount === results.length,
    passCount,
    total: results.length,
    averageScore,
    minScore
  };
}
