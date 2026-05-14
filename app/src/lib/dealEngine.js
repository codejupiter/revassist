export const SAMPLE_DEALS = [
  {
    label: "Yamaha YZF-R1, $2k down, 60mo, 720 score",
    text: "Customer wants a 2024 Yamaha YZF-R1, MSRP $18,399. $2,000 down, 60-month term, 720 FICO. First-time sportbike buyer, no trade-in. Mentioned weekend riding only.",
  },
  {
    label: "Polaris RZR XP, trade-in, 680 score",
    text: "2024 Polaris RZR XP 1000, $24,995. Trading in 2019 RZR 900 (~$11k value), $3k cash down. 680 FICO, 72-month preferred. Family of 4, primarily trail riding in AZ.",
  },
  {
    label: "Sea-Doo GTI 130, financing only",
    text: "Sea-Doo GTI 130, $11,499 OTD. No down payment, full 84-month financing requested. 705 FICO, first watercraft. Wants trailer and life jackets bundled if possible.",
  },
];

export const MOCK_DEAL_RESPONSES = {
  yamaha: {
    summary:
      "First-time sportbike buyer purchasing a 2024 Yamaha YZF-R1 ($18,399 MSRP) with $2,000 down on a 60-month term. 720 FICO indicates strong credit; weekend-only riding suggests low-mileage usage profile.",
    addons: [
      {
        name: "Tire & Wheel Protection",
        rationale:
          "Sportbike tires wear fast and weekend riders often hit unexpected road debris.",
        price_range: "$399-$599",
      },
      {
        name: "GAP Insurance",
        rationale:
          "High-MSRP sportbikes depreciate steeply; protects against negative equity in year 1-2.",
        price_range: "$499-$799",
      },
      {
        name: "Extended Service Contract",
        rationale:
          "First-time sportbike owner - covers complex valve adjustments and electronic systems past factory warranty.",
        price_range: "$899-$1,499",
      },
    ],
    compliance: [
      {
        flag: "Verify motorcycle endorsement (M class) on driver's license before delivery",
        severity: "block",
      },
      {
        flag: "First-time sportbike buyer - recommend MSF safety course referral",
        severity: "warn",
      },
      {
        flag: "Confirm proof of insurance prior to keys release",
        severity: "info",
      },
    ],
    follow_up_sms:
      "Hey! Got your YZF-R1 paperwork started - pre-approval looks great with your 720. I'll have the unit prepped Saturday. Quick reminder to bring your M endorsement and insurance card. Text me with questions.",
  },
  polaris: {
    summary:
      "Family of 4 trading 2019 RZR 900 (~$11k value) toward a 2024 RZR XP 1000 ($24,995) with $3k cash down on a 72-month term. 680 FICO is mid-tier; AZ trail use suggests heavy dust and heat exposure.",
    addons: [
      {
        name: "Powersports Service Contract",
        rationale:
          "Trail UTV use in AZ is hard on CV joints and clutches - extended coverage protects beyond factory bumper-to-bumper.",
        price_range: "$1,299-$1,899",
      },
      {
        name: "GAP Insurance",
        rationale:
          "72-month term on a UTV creates negative equity exposure for the first 36 months.",
        price_range: "$549-$799",
      },
      {
        name: "Tire & Wheel + Theft Protection",
        rationale:
          "AZ trail riders commonly hit cactus thorns; theft coverage adds peace of mind for outdoor storage.",
        price_range: "$699-$999",
      },
    ],
    compliance: [
      {
        flag: "Trade-in inspection required - verify mileage, hours, and title status before locking in $11k value",
        severity: "block",
      },
      {
        flag: "Confirm OHV decal registration timeline with customer (AZ requirement)",
        severity: "warn",
      },
      {
        flag: "Mid-tier 680 FICO - confirm DTI ratio with lender before pushing 72-month term",
        severity: "warn",
      },
    ],
    follow_up_sms:
      "Hey - got the RZR XP deal moving. Need to swing by for a quick trade-in inspection on the 900 so we can lock that $11k. Once that's done, we can finalize delivery this weekend. Sound good?",
  },
  seadoo: {
    summary:
      "First-time watercraft buyer on a 2024 Sea-Doo GTI 130 at $11,499 OTD with no down payment, requesting full 84-month financing. 705 FICO is solid; bundling trailer and life jackets requested upfront.",
    addons: [
      {
        name: "PWC Service Contract",
        rationale:
          "Sea-Doo ACE engines have specific 50-hour service intervals; extended coverage beyond 1-year factory.",
        price_range: "$899-$1,299",
      },
      {
        name: "GAP Insurance",
        rationale:
          "Zero-down + 84-month term creates significant negative equity through year 3.",
        price_range: "$449-$649",
      },
      {
        name: "Trailer + Safety Bundle",
        rationale:
          "Customer already requested - bundle pricing improves margin and removes a follow-up step.",
        price_range: "$1,499-$2,199",
      },
    ],
    compliance: [
      {
        flag: "Zero-down + 84-month requires lender approval - flag for F&I director review",
        severity: "block",
      },
      {
        flag: "Confirm boater education card (required in most states for first-time PWC operators)",
        severity: "warn",
      },
      {
        flag: "Title and registration timing - coordinate with customer's state DMV",
        severity: "info",
      },
    ],
    follow_up_sms:
      "Hey! Sea-Doo GTI is yours - running the financing now and putting together the trailer + jackets bundle so you walk out ready to ride. I'll text once everything's approved, should be quick.",
  },
};

const VALID_SEVERITIES = new Set(["info", "warn", "block"]);

export function selectDealKey(notes = "") {
  const lower = notes.toLowerCase();

  if (lower.includes("polaris") || lower.includes("rzr")) {
    return "polaris";
  }

  if (
    lower.includes("sea-doo") ||
    lower.includes("seadoo") ||
    lower.includes("watercraft") ||
    lower.includes("gti")
  ) {
    return "seadoo";
  }

  return "yamaha";
}

export function getMockDealResponse(notes) {
  return MOCK_DEAL_RESPONSES[selectDealKey(notes)];
}

export function serializeDealResponse(response) {
  return JSON.stringify(response, null, 2);
}

export function validateDealResponse(response) {
  if (!response || typeof response !== "object") return false;
  if (typeof response.summary !== "string" || !response.summary.trim()) return false;
  if (typeof response.follow_up_sms !== "string" || !response.follow_up_sms.trim()) return false;

  if (!Array.isArray(response.addons) || response.addons.length !== 3) return false;
  if (
    !response.addons.every(
      addon =>
        addon &&
        typeof addon.name === "string" &&
        typeof addon.rationale === "string" &&
        typeof addon.price_range === "string"
    )
  ) {
    return false;
  }

  if (!Array.isArray(response.compliance) || response.compliance.length === 0) return false;
  return response.compliance.every(
    item =>
      item &&
      typeof item.flag === "string" &&
      typeof item.severity === "string" &&
      VALID_SEVERITIES.has(item.severity)
  );
}

export function parseDealOutput(rawOutput) {
  if (!rawOutput?.trim()) return null;

  try {
    const parsed = JSON.parse(rawOutput.replace(/```json|```/g, "").trim());
    return validateDealResponse(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function buildCopyText(response) {
  if (!validateDealResponse(response)) return "";

  return [
    "DEAL SUMMARY",
    response.summary,
    "",
    "SUGGESTED ADD-ONS",
    ...response.addons.map(
      addon => `${addon.name} (${addon.price_range}) - ${addon.rationale}`
    ),
    "",
    "COMPLIANCE FLAGS",
    ...response.compliance.map(
      item => `[${item.severity.toUpperCase()}] ${item.flag}`
    ),
    "",
    "CUSTOMER FOLLOW-UP SMS",
    response.follow_up_sms,
  ].join("\n");
}
