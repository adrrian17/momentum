import "varlock/auto-load";
import { defineConfig, devices } from "@playwright/test";

import { ENV } from "./src/env";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e-results/artifacts",
  reporter: [
    ["list"],
    ["html", { outputFolder: "./e2e-results/report", open: "never" }],
  ],
  workers: 4,
  use: {
    baseURL: ENV.AUTH_TEST_BASE_URL,
    trace: "on",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/u },
    {
      name: "pwa-chromium",
      testMatch: /(?:pwa|theme)\.spec\.ts/u,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:4173" },
    },
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /(?:pwa|theme)\.spec\.ts/u,
      dependencies: ["setup"],
    },
    {
      name: "iphone-webkit",
      use: { ...devices["iPhone 15"] },
      testIgnore: /(?:pwa|theme)\.spec\.ts/u,
      dependencies: ["setup"],
    },
  ],
  webServer: [
    {
      command: `CORS_ORIGIN=${ENV.AUTH_TEST_BASE_URL} pnpm --dir ../../packages/infra dev:local --stage ${ENV.AUTH_TEST_STAGE}`,
      // Resolve the infra schema without re-injecting the parent web env over CORS_ORIGIN.
      env: { __VARLOCK_ENV: "" },
      url: ENV.AUTH_TEST_BASE_URL,
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
