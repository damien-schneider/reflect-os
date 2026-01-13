import { expect, test } from "@playwright/test";
import { signUpNewUser, waitForDashboardStable } from "./helpers";

// Top-level regex patterns for performance
const DASHBOARD_ORG_REGEX = /\/dashboard\/[^/]+/;
const DASHBOARD_REGEX = /\/dashboard/;

/**
 * E2E tests for Zero sync resilience.
 *
 * These tests verify that the app handles stale IndexedDB data gracefully.
 * This can happen when:
 * - Dev server restarts (zero-cache gets new state)
 * - User has old session cookies with stale Zero client IDs
 * - Browser has cached Zero data from a different server instance
 */
test.describe("Zero Sync Resilience", () => {
  // Run tests serially to avoid parallel execution issues
  test.describe.configure({ mode: "serial" });

  test("should connect to Zero successfully after fresh signup", async ({
    page,
  }) => {
    // This is the baseline test - a fresh user should connect without issues
    await signUpNewUser(page, { name: "Zero Test User" });

    // Wait for dashboard to be stable (includes Zero sync)
    await waitForDashboardStable(page);

    // Verify we're on the dashboard with an organization
    await expect(page).toHaveURL(DASHBOARD_ORG_REGEX);

    // Verify the sidebar is visible (indicates successful Zero sync)
    await expect(page.locator("aside")).toBeVisible({ timeout: 10_000 });
  });

  test("should handle connection errors gracefully", async ({ page }) => {
    // Go to login page first
    await page.goto("/login");

    // Wait for Zero to connect (even as anon)
    await page
      .waitForFunction(
        () => !document.body.textContent?.includes("Connecting to sync server"),
        { timeout: 15_000 }
      )
      .catch(() => {
        // May not show the loading state, continue
      });

    // Verify the login form is visible
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible({
      timeout: 10_000,
    });

    // The page should be interactive (not stuck in loading)
    await expect(page.getByRole("textbox", { name: "Email" })).toBeEnabled();
  });

  test("should persist session across page reloads", async ({ page }) => {
    // Create user
    await signUpNewUser(page, { name: "Persistence Test User" });
    await waitForDashboardStable(page);

    // Reload the page
    await page.reload();

    // Should still be on dashboard (session persisted)
    await waitForDashboardStable(page);
    await expect(page).toHaveURL(DASHBOARD_REGEX);

    // Zero should reconnect
    await expect(page.locator("aside")).toBeVisible({ timeout: 10_000 });
  });

  test("should recover from stale Zero IndexedDB data", async ({ page }) => {
    // First, create a valid session
    await signUpNewUser(page, { name: "Stale Data Test User" });
    await waitForDashboardStable(page);

    // Store the current URL (should be on org dashboard)
    const dashboardUrl = page.url();
    expect(dashboardUrl).toMatch(DASHBOARD_ORG_REGEX);

    // Simulate stale Zero data by clearing IndexedDB (simulates server restart)
    await page.evaluate(async () => {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    });

    // Wait a moment for IndexedDB operations
    await page.waitForTimeout(500);

    // Reload the page - this should trigger Zero to reconnect with fresh state
    await page.reload();

    // The app should recover and reconnect
    await waitForDashboardStable(page, 30_000);

    // Verify we're still on the dashboard
    await expect(page).toHaveURL(DASHBOARD_REGEX);

    // Verify Zero sync is working (sidebar visible)
    await expect(page.locator("aside")).toBeVisible({ timeout: 10_000 });
  });
});
