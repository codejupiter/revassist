import type { DealOutput } from "@/lib/deal/schema";

export type EvalExpectation = {
  label: string;
  anyOf: string[];
};

export type DealEvalCase = {
  id: string;
  title: string;
  notes: string;
  expectedProfile: "yamaha" | "polaris" | "seadoo";
  minScore: number;
  expectations: {
    summary: EvalExpectation[];
    addons: EvalExpectation[];
    compliance: EvalExpectation[];
    sms: EvalExpectation[];
    requiredSeverities: DealOutput["compliance"][number]["severity"][];
  };
};

export const DEAL_EVAL_CASES: DealEvalCase[] = [
  {
    id: "yamaha-first-time-sportbike",
    title: "First-time sportbike buyer needs delivery blockers",
    notes:
      "Customer wants a 2024 Yamaha YZF-R1, MSRP $18,399. $2,000 down, 60-month term, 720 FICO. First-time sportbike buyer, no trade-in. Mentioned weekend riding only.",
    expectedProfile: "yamaha",
    minScore: 88,
    expectations: {
      summary: [
        { label: "vehicle", anyOf: ["yamaha", "yzf-r1", "r1"] },
        { label: "buyer profile", anyOf: ["first-time", "first time", "sportbike"] }
      ],
      addons: [
        { label: "tire protection", anyOf: ["tire & wheel", "tire and wheel"] },
        { label: "gap", anyOf: ["gap"] },
        { label: "service coverage", anyOf: ["extended service", "service contract"] }
      ],
      compliance: [
        { label: "license blocker", anyOf: ["motorcycle endorsement", "license"] },
        { label: "insurance blocker", anyOf: ["proof of insurance", "insurance"] },
        { label: "safety coaching", anyOf: ["msf", "safety course"] }
      ],
      sms: [{ label: "vehicle callback", anyOf: ["yzf-r1", "r1"] }],
      requiredSeverities: ["block", "warn"]
    }
  },
  {
    id: "polaris-family-trade",
    title: "Family UTV trade needs title and term checks",
    notes:
      "2024 Polaris RZR XP 1000, $24,995. Trading in 2019 RZR 900, around $11k value, plus $3k cash down. 680 FICO, 72-month preferred. Family of 4, primarily trail riding in Arizona.",
    expectedProfile: "polaris",
    minScore: 88,
    expectations: {
      summary: [
        { label: "vehicle", anyOf: ["polaris", "rzr", "xp 1000"] },
        { label: "trade", anyOf: ["trade", "trading"] }
      ],
      addons: [
        { label: "service contract", anyOf: ["service contract"] },
        { label: "gap", anyOf: ["gap"] },
        { label: "tire or theft", anyOf: ["tire & wheel", "theft"] }
      ],
      compliance: [
        { label: "trade inspection", anyOf: ["trade inspection", "title verification"] },
        { label: "term risk", anyOf: ["72-month", "72 month", "lender advance"] },
        { label: "ohv registration", anyOf: ["ohv", "registration"] }
      ],
      sms: [{ label: "trade callback", anyOf: ["trade inspection", "title check"] }],
      requiredSeverities: ["block", "warn", "info"]
    }
  },
  {
    id: "seadoo-zero-down-long-term",
    title: "Zero-down PWC deal needs director review",
    notes:
      "Sea-Doo GTI 130, $11,499 OTD. No down payment, full 84-month financing requested. 705 FICO, first watercraft. Wants trailer and life jackets bundled if possible.",
    expectedProfile: "seadoo",
    minScore: 88,
    expectations: {
      summary: [
        { label: "vehicle", anyOf: ["sea-doo", "gti", "pwc"] },
        { label: "structure", anyOf: ["zero-down", "zero down", "84-month", "84 month"] }
      ],
      addons: [
        { label: "pwc coverage", anyOf: ["pwc service", "service contract"] },
        { label: "gap", anyOf: ["gap"] },
        { label: "trailer bundle", anyOf: ["trailer", "safety bundle"] }
      ],
      compliance: [
        { label: "director review", anyOf: ["director review", "84-month", "84 month"] },
        { label: "boater education", anyOf: ["boater education", "operating state"] },
        { label: "registration timing", anyOf: ["registration", "title"] }
      ],
      sms: [{ label: "structure callback", anyOf: ["zero-down", "trailer bundle"] }],
      requiredSeverities: ["block", "warn", "info"]
    }
  },
  {
    id: "polaris-lowercase-rzr",
    title: "Loose notes still route UTV deal correctly",
    notes:
      "rzr buyer wants a used 2022 side by side and has a trade with unclear payoff. Wants longest term available because family rides desert trails most weekends.",
    expectedProfile: "polaris",
    minScore: 82,
    expectations: {
      summary: [
        { label: "vehicle class", anyOf: ["rzr", "trail", "utv"] },
        { label: "family usage", anyOf: ["family", "trail"] }
      ],
      addons: [
        { label: "durability coverage", anyOf: ["service contract", "trail riding"] },
        { label: "negative equity protection", anyOf: ["gap", "negative equity"] }
      ],
      compliance: [
        { label: "trade risk", anyOf: ["trade inspection", "title verification"] },
        { label: "term review", anyOf: ["72-month", "debt-to-income", "lender advance"] }
      ],
      sms: [{ label: "trade callback", anyOf: ["trade inspection", "title check"] }],
      requiredSeverities: ["block", "warn"]
    }
  },
  {
    id: "watercraft-without-brand",
    title: "Watercraft language maps to PWC safeguards",
    notes:
      "First watercraft customer asks for no money down on a PWC and wants trailer, jackets, and registration handled before a holiday weekend pickup.",
    expectedProfile: "seadoo",
    minScore: 82,
    expectations: {
      summary: [
        { label: "watercraft profile", anyOf: ["pwc", "watercraft", "first-time"] },
        { label: "financing risk", anyOf: ["zero-down", "no cash down", "term length"] }
      ],
      addons: [
        { label: "pwc coverage", anyOf: ["pwc service", "watercraft"] },
        { label: "trailer bundle", anyOf: ["trailer", "safety bundle"] }
      ],
      compliance: [
        { label: "financing review", anyOf: ["zero-down", "director review"] },
        { label: "boater education", anyOf: ["boater education", "operating state"] },
        { label: "registration", anyOf: ["registration", "title"] }
      ],
      sms: [{ label: "package callback", anyOf: ["sea-doo", "package", "trailer"] }],
      requiredSeverities: ["block", "warn"]
    }
  }
];
