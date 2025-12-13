import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration
 *
 * Supports two modes controlled by PLAYWRIGHT_BUILD_MODE env var:
 *
 * 1. Dev mode (default): `bun run e2e:dev`
 *    - Runs against vite dev server on localhost:5173
 *    - Starts `bun dev` which runs vite + zero-cache via turbo
 *
 * 2. Build mode: `bun run e2e:build`
 *    - Runs against production build on 127.0.0.1:4173
 *    - Playwright orchestrates: backend, zero-cache, then web server
 *    - Prerequisite: docker must be running (`bun docker:start`)
 */

const isBuildMode = !!process.env.PLAYWRIGHT_BUILD_MODE;

export default defineConfig({
  testDir: "./apps/web/e2e",
  /* Run tests sequentially in build mode for stability */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on failure */
  retries: isBuildMode ? 1 : process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? "github" : "line",
  /* Global timeout for each test */
  timeout: isBuildMode ? 20_000 : 30_000,

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL depends on mode */
    baseURL: "http://localhost:5173",
    /* Collect trace when retrying the failed test. */
    trace: "on-first-retry",
    /* Take screenshot on failure */
    screenshot: "only-on-failure",
  },

  /* Configure projects for major browsers */
  projects: isBuildMode
    ? [
        /* Only chromium in build mode for speed and stability */
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
      ]
    : [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
        { name: "firefox", use: { ...devices["Desktop Firefox"] } },
        { name: "webkit", use: { ...devices["Desktop Safari"] } },
        { name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },
        { name: "Mobile Safari", use: { ...devices["iPhone 12"] } },
      ],

  /* Run your local dev server before starting the tests */
  webServer: isBuildMode
    ? {
        // Build mode: reuse the same daily scripts on the same URL
        command: "bun run docker:start && bun run build && bun dev",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "ignore",
        stderr: "pipe",
      }
    : {
        // Dev mode: start vite + zero-cache via turbo
        command: "bun dev",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
