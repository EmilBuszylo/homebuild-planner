import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  testIgnore: "**/seed.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      timeout: process.env.CI ? 90_000 : 30_000,
    },
    {
      name: "foreign-plan-setup",
      testMatch: /foreign-plan\.setup\.ts/,
      timeout: process.env.CI ? 90_000 : 30_000,
    },
    {
      name: "generate-user-setup",
      testMatch: /generate-user\.setup\.ts/,
      timeout: process.env.CI ? 60_000 : 30_000,
    },
    {
      name: "anonymous",
      testMatch: /risk-02-anonymous.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "authenticated",
      testMatch: /risk-02-session.*\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
    },
    {
      name: "risk-01",
      testMatch: /risk-01-.*\.spec\.ts/,
      dependencies: ["setup", "foreign-plan-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
    },
    {
      name: "risk-04",
      testMatch: /risk-04-.*\.spec\.ts/,
      dependencies: ["generate-user-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/generate-user.json",
      },
    },
    {
      name: "risk-07",
      testMatch: /risk-07-.*\.spec\.ts/,
      dependencies: ["generate-user-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/generate-user.json",
      },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
