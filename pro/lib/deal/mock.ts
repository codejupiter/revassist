import type { DealOutput } from "./schema";

export type SampleDeal = {
  label: string;
  text: string;
};

export const SAMPLE_DEALS: SampleDeal[] = [
  {
    label: "Yamaha YZF-R1",
    text: "Customer wants a 2024 Yamaha YZF-R1, MSRP $18,399. $2,000 down, 60-month term, 720 FICO. First-time sportbike buyer, no trade-in. Mentioned weekend riding only."
  },
  {
    label: "Polaris RZR XP",
    text: "2024 Polaris RZR XP 1000, $24,995. Trading in 2019 RZR 900, around $11k value, plus $3k cash down. 680 FICO, 72-month preferred. Family of 4, primarily trail riding in Arizona."
  },
  {
    label: "Sea-Doo GTI",
    text: "Sea-Doo GTI 130, $11,499 OTD. No down payment, full 84-month financing requested. 705 FICO, first watercraft. Wants trailer and life jackets bundled if possible."
  }
];

const RESPONSES: Record<string, DealOutput> = {
  yamaha: {
    summary:
      "First-time sportbike buyer purchasing a 2024 Yamaha YZF-R1 with $2,000 down on a 60-month term. Strong 720 FICO and weekend-only usage make the deal financeable, but delivery needs license and insurance verification.",
    addons: [
      {
        name: "Tire & Wheel Protection",
        rationale:
          "Sportbike tires are expensive and weekend riders are still exposed to debris, potholes, and roadside hazards.",
        price_range: "$399-$599"
      },
      {
        name: "GAP Insurance",
        rationale:
          "High-MSRP sportbikes can depreciate quickly, especially in the first two years of a financed term.",
        price_range: "$499-$799"
      },
      {
        name: "Extended Service Contract",
        rationale:
          "A first-time sportbike owner benefits from coverage on electronics, valve service, and major mechanical repairs.",
        price_range: "$899-$1,499"
      }
    ],
    compliance: [
      {
        flag: "Verify motorcycle endorsement before delivery.",
        severity: "block"
      },
      {
        flag: "Confirm proof of insurance before releasing keys.",
        severity: "block"
      },
      {
        flag: "Recommend MSF safety course referral for first-time sportbike buyer.",
        severity: "warn"
      }
    ],
    follow_up_sms:
      "Your YZF-R1 paperwork is moving and the approval profile looks strong. Please bring your motorcycle endorsement and insurance card so we can keep delivery on track."
  },
  polaris: {
    summary:
      "Family trail-use buyer moving from a 2019 RZR 900 into a 2024 RZR XP 1000 with trade equity and $3,000 down. The 680 FICO and 72-month preference make lender structure and trade verification the key deal risks.",
    addons: [
      {
        name: "Powersports Service Contract",
        rationale:
          "Arizona trail riding is hard on clutches, CV joints, suspension, and cooling systems.",
        price_range: "$1,299-$1,899"
      },
      {
        name: "GAP Insurance",
        rationale:
          "A 72-month UTV term can create negative equity exposure through the first half of the loan.",
        price_range: "$549-$799"
      },
      {
        name: "Tire & Wheel + Theft Protection",
        rationale:
          "Trail damage and outdoor storage risk make this a practical bundle for a family UTV buyer.",
        price_range: "$699-$999"
      }
    ],
    compliance: [
      {
        flag: "Complete trade inspection and title verification before locking the $11k value.",
        severity: "block"
      },
      {
        flag: "Confirm debt-to-income and lender advance before quoting 72-month terms.",
        severity: "warn"
      },
      {
        flag: "Review Arizona OHV registration and decal expectations.",
        severity: "info"
      }
    ],
    follow_up_sms:
      "The RZR XP deal is moving. We just need a quick trade inspection and title check on your 900 so we can lock the value and finalize delivery options."
  },
  seadoo: {
    summary:
      "First-time PWC buyer requesting zero-down, 84-month financing on a Sea-Doo GTI 130 with trailer and safety gear bundled. Credit is solid, but term length and no cash down should be reviewed before final approval.",
    addons: [
      {
        name: "PWC Service Contract",
        rationale:
          "First-time watercraft owners benefit from coverage beyond factory warranty and predictable service support.",
        price_range: "$899-$1,299"
      },
      {
        name: "GAP Insurance",
        rationale:
          "Zero down plus 84 months creates meaningful negative equity risk during early ownership.",
        price_range: "$449-$649"
      },
      {
        name: "Trailer + Safety Bundle",
        rationale:
          "The customer already wants trailer and life jackets, so bundling removes friction and protects margin.",
        price_range: "$1,499-$2,199"
      }
    ],
    compliance: [
      {
        flag: "Route zero-down 84-month structure to F&I director review before quoting final terms.",
        severity: "block"
      },
      {
        flag: "Confirm boater education requirements for the buyer's operating state.",
        severity: "warn"
      },
      {
        flag: "Coordinate title and registration timing before delivery.",
        severity: "info"
      }
    ],
    follow_up_sms:
      "Your Sea-Doo package is coming together. I am reviewing the zero-down structure and trailer bundle now, then I will send final approval and delivery details."
  }
};

export function selectDealProfile(notes: string) {
  const lower = notes.toLowerCase();
  if (lower.includes("polaris") || lower.includes("rzr")) return "polaris";
  if (lower.includes("sea-doo") || lower.includes("seadoo") || lower.includes("watercraft") || lower.includes("gti")) {
    return "seadoo";
  }
  return "yamaha";
}

export function getMockDealOutput(notes: string): DealOutput {
  return RESPONSES[selectDealProfile(notes)] ?? RESPONSES.yamaha;
}

export function getPartialOutputs(output: DealOutput): Partial<DealOutput>[] {
  return [
    { summary: output.summary },
    { summary: output.summary, addons: output.addons.slice(0, 1) },
    { summary: output.summary, addons: output.addons.slice(0, 2) },
    { summary: output.summary, addons: output.addons },
    { summary: output.summary, addons: output.addons, compliance: output.compliance },
    output
  ];
}
