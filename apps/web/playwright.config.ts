import "varlock/auto-load";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e-results/artifacts",
  reporter: [
    ["list"],
    ["html", { outputFolder: "./e2e-results/report", open: "never" }],
  ],
  use: {
    baseURL: "http://localhost:3001",
    trace: "on",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/u },
    {
      name: "pwa-chromium",
      testMatch: /pwa\.spec\.ts/u,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:4173" },
    },
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /pwa\.spec\.ts/u,
      dependencies: ["setup"],
    },
    {
      name: "iphone-webkit",
      use: { ...devices["iPhone 15"] },
      testIgnore: /pwa\.spec\.ts/u,
      dependencies: ["setup"],
    },
  ],
  webServer: [
    {
      command: "pnpm --dir ../.. run dev",
      url: "http://localhost:3001",
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      // The service worker exists only in production builds.
      command: "pnpm run build && pnpm run serve --port 4173 --strictPort",
      url: "http://localhost:4173",
      timeout: 120_000,
    },
  ],
});
