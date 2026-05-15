import type { DealOutput } from "./schema";

export function buildCopyText(output: DealOutput) {
  return [
    "DEAL SUMMARY",
    output.summary,
    "",
    "SUGGESTED ADD-ONS",
    ...output.addons.map((addon) => `${addon.name} (${addon.price_range}) - ${addon.rationale}`),
    "",
    "COMPLIANCE FLAGS",
    ...output.compliance.map((flag) => `[${flag.severity.toUpperCase()}] ${flag.flag}`),
    "",
    "CUSTOMER FOLLOW-UP SMS",
    output.follow_up_sms
  ].join("\n");
}
