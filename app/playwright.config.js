import { defineConfig, devices } from "@playwright/test";

const PORT = 4178;

export default defineConfig({
  testDir: "./tests/smoke",
  testMatch: "**/*.smoke.js",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  reporter: process.env.CI ? [["dot"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}/`,
    trace: "on-first-retry",
  },
  webServer: {
    command: `VITE_BASE_PATH=/ npm run build -- --outDir smoke-dist && npm run preview -- --host 127.0.0.1 --port ${PORT} --outDir smoke-dist`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
