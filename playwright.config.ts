import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  workers: 1,
  fullyParallel: false,
  use: {
    ...devices["iPhone 13"],
    defaultBrowserType: "chromium",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run assets && npx tsx tests/browser-server.ts",
    url: "http://localhost:8787/api/catalog",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
