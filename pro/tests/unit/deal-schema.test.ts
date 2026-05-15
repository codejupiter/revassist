import { describe, expect, it } from "vitest";
import { buildCopyText } from "@/lib/deal/copy";
import { getMockDealOutput, getPartialOutputs, selectDealProfile } from "@/lib/deal/mock";
import { dealOutputSchema, dealRequestSchema } from "@/lib/deal/schema";

describe("RevAssist Pro deal schema", () => {
  it("validates incoming deal requests", () => {
    const parsed = dealRequestSchema.parse({
      notes: "Customer wants a 2024 Yamaha YZF-R1 with $2k down and 720 FICO.",
      dealerId: "demo",
      operatorId: "manager",
      channel: "deal-desk"
    });

    expect(parsed.notes).toContain("Yamaha");
    expect(() => dealRequestSchema.parse({ notes: "too short" })).toThrow();
  });

  it("routes sample notes to deterministic profiles", () => {
    expect(selectDealProfile("Polaris RZR family trail rig")).toBe("polaris");
    expect(selectDealProfile("Sea-Doo GTI first watercraft")).toBe("seadoo");
    expect(selectDealProfile("Yamaha sportbike buyer")).toBe("yamaha");
  });

  it("returns schema-valid mock outputs and partials", () => {
    const output = getMockDealOutput("Sea-Doo GTI zero down");
    expect(dealOutputSchema.safeParse(output).success).toBe(true);
    expect(output.addons).toHaveLength(3);
    expect(output.compliance.some((flag) => flag.severity === "block")).toBe(true);
    expect(getPartialOutputs(output).at(-1)).toEqual(output);
  });

  it("formats a copy-ready transcript", () => {
    const text = buildCopyText(getMockDealOutput("Polaris RZR trade"));
    expect(text).toContain("DEAL SUMMARY");
    expect(text).toContain("SUGGESTED ADD-ONS");
    expect(text).toContain("[BLOCK]");
    expect(text).toContain("CUSTOMER FOLLOW-UP SMS");
  });
});
