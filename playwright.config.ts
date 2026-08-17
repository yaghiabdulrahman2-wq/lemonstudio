import { defineConfig, devices } from "@playwright/test";

/** End-to-end regression suite for the core Lemonade Studio flows. */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env["E2E_BASE_URL"] ?? "http://localhost:8080",
    trace: "retain-on-failure",
    // Allows running against a preinstalled Chromium (CI sandboxes, Nix, etc.).
    launchOptions: {
      executablePath: process.env["CHROMIUM_PATH"] ?? "/bin/chromium",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
