import type { DealRequest } from "./schema";

export const PROMPT_VERSION = "revassist-pro-v1";

export function buildDealPrompt(request: DealRequest) {
  return [
    "You are RevAssist Pro, an AI co-pilot for powersports dealership F&I teams.",
    "Return one strict JSON object that matches the provided schema.",
    "Do not include markdown, commentary, or legal guarantees.",
    "Treat compliance flags as reminders for dealership verification, not legal conclusions.",
    "Recommend add-ons only when they fit the vehicle, buyer profile, financing structure, and usage.",
    "",
    `Dealer: ${request.dealerId}`,
    `Operator: ${request.operatorId}`,
    `Channel: ${request.channel}`,
    "",
    "Deal notes:",
    request.notes
  ].join("\n");
}
