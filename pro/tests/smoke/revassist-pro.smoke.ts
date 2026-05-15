import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  expect(overflow).toBe(false);
}

test.describe("RevAssist Pro", () => {
  test("runs a structured deal analysis", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("pro-shell")).toBeVisible();
    await expect(page.getByRole("heading", { name: /deal desk os/i })).toBeVisible();
    await expect(page.getByTestId("deal-notes")).toHaveValue(/Yamaha YZF-R1/);
    await expect(page.getByTestId("session-card")).toContainText("Sun Valley Powersports");
    await expect(page.getByTestId("analyze-button")).toBeEnabled();

    await page.getByTestId("analyze-button").click();

    await expect(page.getByTestId("summary-section")).toContainText("Yamaha YZF-R1");
    await expect(page.getByTestId("addons-section")).toContainText("Tire & Wheel Protection");
    await expect(page.getByTestId("compliance-section")).toContainText("motorcycle endorsement");
    await expect(page.getByTestId("sms-section")).toContainText("YZF-R1");
    await expect(page.getByTestId("history-list")).toContainText("completed");
    await expect(page.getByTestId("audit-list")).toContainText("deal run completed");

    await expectNoHorizontalOverflow(page);
  });

  test("supports sample switching on mobile and desktop", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("analyze-button")).toBeEnabled();
    await page.getByRole("button", { name: "Polaris RZR XP" }).click();
    await expect(page.getByTestId("deal-notes")).toHaveValue(/Polaris RZR XP 1000/);
    await page.getByTestId("analyze-button").click();
    await expect(page.getByTestId("summary-section")).toContainText("Family trail-use buyer");
    await expect(page.getByTestId("compliance-section")).toContainText("trade inspection");
    await expectNoHorizontalOverflow(page);
  });
});
