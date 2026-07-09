import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://localhost:3012";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 180_000,
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/playwright-report.json" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 30_000,
    navigationTimeout: 45_000,
  },
  webServer: undefined,
  projects: [
    {
      name: "prototype-local-luxury-mobile",
      use: { ...devices["Pixel 5"] },
      metadata: {
        personaId: "P-A01",
        personaProfile: "local-luxury",
        personaDevice: "mobile",
      },
    },
    {
      name: "prototype-local-luxury-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
      metadata: {
        personaId: "P-A02",
        personaProfile: "local-luxury",
        personaDevice: "desktop",
      },
    },
    {
      name: "prototype-international-mobile",
      use: {
        ...devices["Pixel 5"],
      },
      metadata: {
        personaId: "P-A04",
        personaProfile: "international",
        personaDevice: "mobile",
      },
    },
    {
      name: "prototype-corporate-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
      metadata: {
        personaId: "P-A06",
        personaProfile: "corporate",
        personaDevice: "desktop",
      },
    },
  ],
});
