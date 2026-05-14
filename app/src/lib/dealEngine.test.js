import { describe, expect, it } from "vitest";
import {
  MOCK_DEAL_RESPONSES,
  buildCopyText,
  getMockDealResponse,
  parseDealOutput,
  selectDealKey,
  serializeDealResponse,
  validateDealResponse,
} from "./dealEngine";

describe("dealEngine", () => {
  it("routes notes to the closest powersports deal profile", () => {
    expect(selectDealKey("Customer wants a Polaris RZR with trade-in")).toBe("polaris");
    expect(selectDealKey("First watercraft buyer looking at a Sea-Doo GTI")).toBe("seadoo");
    expect(selectDealKey("Yamaha sportbike buyer with 720 FICO")).toBe("yamaha");
  });

  it("returns schema-valid mocked deal responses", () => {
    for (const response of Object.values(MOCK_DEAL_RESPONSES)) {
      expect(validateDealResponse(response)).toBe(true);
      expect(response.addons).toHaveLength(3);
      expect(response.compliance.some(item => item.severity === "block")).toBe(true);
    }
  });

  it("serializes and parses strict JSON responses", () => {
    const response = getMockDealResponse("Sea-Doo GTI 130, zero down, 84 months");
    const serialized = serializeDealResponse(response);

    expect(parseDealOutput(serialized)).toEqual(response);
    expect(parseDealOutput(`\`\`\`json\n${serialized}\n\`\`\``)).toEqual(response);
  });

  it("rejects partial JSON and malformed response shapes", () => {
    expect(parseDealOutput("{\"summary\":\"still streaming\"")).toBeNull();
    expect(parseDealOutput(JSON.stringify({ summary: "Missing workflow sections" }))).toBeNull();
    expect(
      validateDealResponse({
        ...MOCK_DEAL_RESPONSES.yamaha,
        compliance: [{ flag: "Unknown severity", severity: "critical" }],
      })
    ).toBe(false);
  });

  it("creates a recruiter-readable copy/export transcript", () => {
    const text = buildCopyText(MOCK_DEAL_RESPONSES.polaris);

    expect(text).toContain("DEAL SUMMARY");
    expect(text).toContain("SUGGESTED ADD-ONS");
    expect(text).toContain("[BLOCK]");
    expect(text).toContain("CUSTOMER FOLLOW-UP SMS");
  });
});
