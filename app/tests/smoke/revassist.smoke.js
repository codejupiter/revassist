import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const documentWidth = document.documentElement.scrollWidth;
    const viewportWidth = document.documentElement.clientWidth;
    return documentWidth > viewportWidth + 1;
  });

  expect(overflow).toBe(false);
}

test.describe("RevAssist production workflow", () => {
  test("renders the deal desk shell", async ({ page }) => {
    await page.goto("./");

    await expect(page.getByTestId("app-shell")).toBeVisible();
    await expect(page.getByRole("heading", { name: /close more deals/i })).toBeVisible();
    await expect(page.getByLabel("Deal notes")).toHaveValue(/Yamaha YZF-R1/);
    await expect(page.getByRole("button", { name: /run deal/i })).toBeEnabled();
    await expect(page.getByTestId("output-panel").getByText("Deal Summary")).toBeVisible();
    await expect(page.getByTestId("output-panel").getByText("Follow-Up SMS")).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });

  test("streams a schema-locked deal response", async ({ page }) => {
    await page.goto("./");
    await page.getByTestId("run-deal-button").click();

    await expect(page.getByTestId("deal-summary")).toContainText("Yamaha YZF-R1");
    await expect(page.getByTestId("addons-list")).toContainText("Tire & Wheel Protection");
    await expect(page.getByTestId("compliance-list")).toContainText("M class");
    await expect(page.getByTestId("follow-up-sms")).toContainText("pre-approval looks great");
    await expect(page.getByText(/generated in/i)).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });

  test("supports sample switching and reset", async ({ page }) => {
    await page.goto("./");

    await page.getByRole("button", { name: /Polaris RZR XP/i }).click();
    await expect(page.getByTestId("deal-notes-input")).toHaveValue(/Polaris RZR XP 1000/);

    await page.getByTestId("run-deal-button").click();
    await expect(page.getByTestId("deal-summary")).toContainText("Family of 4");
    await expect(page.getByTestId("compliance-list")).toContainText("Trade-in inspection required");

    await page.getByRole("button", { name: /reset/i }).click();
    await expect(page.getByTestId("deal-notes-input")).toHaveValue("");
    await expect(page.getByTestId("output-panel")).toContainText("Run a deal to generate");
  });
});
