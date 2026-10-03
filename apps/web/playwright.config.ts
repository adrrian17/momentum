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
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "iphone-webkit", use: { ...devices["iPhone 15"] } },
  ],
  webServer: {
    command: "pnpm --dir ../.. run dev",
    url: "http://localhost:3001",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
