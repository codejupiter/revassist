import { defineConfig, devices } from "@playwright/test";

const PORT = 3011;

export default defineConfig({
  testDir: "./tests/smoke",
  testMatch: "**/*.smoke.ts",
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: true,
  reporter: process.env.CI ? [["dot"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry"
  },
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    env: {
      ...process.env,
      REVASSIST_SESSION_SECRET: process.env.REVASSIST_SESSION_SECRET ?? "revassist-pro-smoke-test-secret"
    },
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] }
    }
  ]
});
