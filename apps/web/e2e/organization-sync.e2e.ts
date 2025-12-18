import { expect, test } from "@playwright/test";
import { signUpNewUser, waitForDashboardStable } from "./helpers";

// Define regex at top level for performance
const DASHBOARD_URL_REGEX = /\/dashboard\/[^/]+/;

/**
 * Tests for organization data synchronization after account creation.
 *
 * Bug reproduced: "Infinite Syncing organization data..." after signup
 *
 * Root cause:
 * - Zero 0.25 deprecated RLS permissions in favor of named queries
 * - Schema had `enableLegacyQueries: true` but no RLS permissions defined
 * - Direct `zql.*` queries (legacy queries) returned empty results
 * - Dashboard showed infinite "Syncing organization data..." spinner
 *
 * Fix:
 * - Migrated all reactive useQuery hooks to named queries from queries.ts
 * - Set `enableLegacyQueries: false` in schema
 * - Named queries handle auth context filtering server-side
 */
test.describe("Organization Sync", () => {
  test("should sync organization data after signup without infinite loading", async ({
    page,
  }) => {
    // Step 1: Sign up a new user
    const email = await signUpNewUser(page);
    console.log(`Signed up new user: ${email}`);

    // Step 2: Should be on dashboard or onboarding
    // New users without orgs go to onboarding, existing users go to org dashboard
    await waitForDashboardStable(page, 30_000);

    // Step 3: Check we're NOT stuck in the syncing state
    const syncingIndicator = page.getByText("Syncing organization data...");
    const isStuckSyncing = await syncingIndicator
      .isVisible()
      .catch(() => false);

    // If we see syncing, wait a reasonable amount and check again
    if (isStuckSyncing) {
      console.log("DEBUG: Syncing indicator visible, waiting...");
      await page.waitForTimeout(5000);

      // After waiting, it should NOT still show syncing (that's the bug)
      const stillSyncing = await syncingIndicator
        .isVisible()
        .catch(() => false);
      expect(stillSyncing).toBe(false);
    }

    // Step 4: Should either be on onboarding page (create org) or org dashboard
    const onboardingPage = page.getByText("Create your organization");
    const orgDashboard = page.getByText("Welcome back");

    // One of these should be visible
    const isOnOnboarding = await onboardingPage.isVisible().catch(() => false);
    const isOnDashboard = await orgDashboard.isVisible().catch(() => false);

    console.log(
      `Final state: onboarding=${isOnOnboarding}, dashboard=${isOnDashboard}`
    );
    expect(isOnOnboarding || isOnDashboard).toBe(true);
  });

  test("should redirect to org dashboard after creating organization", async ({
    page,
  }) => {
    // Step 1: Sign up a new user
    await signUpNewUser(page);

    // Step 2: Wait for dashboard to stabilize
    await waitForDashboardStable(page, 30_000);

    // Step 3: If on onboarding, create an organization
    const onboardingPage = page.getByText("Create your organization");
    const isOnOnboarding = await onboardingPage.isVisible().catch(() => false);

    if (isOnOnboarding) {
      console.log("DEBUG: On onboarding page, creating organization...");

      // Fill organization name
      const orgNameInput = page.getByLabel("Organization Name");
      await expect(orgNameInput).toBeVisible({ timeout: 5000 });
      await orgNameInput.fill(`Test Org ${Date.now()}`);

      // Submit the form
      const createButton = page.getByRole("button", {
        name: "Create Organization",
      });
      await createButton.click();

      // Wait for navigation to org dashboard
      await page.waitForURL(DASHBOARD_URL_REGEX, { timeout: 20_000 });
    }

    // Step 4: Verify we're on the org dashboard (not stuck syncing)
    await expect(page.getByText("Welcome back")).toBeVisible({
      timeout: 10_000,
    });

    // Step 5: Verify organization content is loaded
    // Should show "Total Boards" stat card
    await expect(page.getByText("Total Boards")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("should not show sync timeout error after organization creation", async ({
    page,
  }) => {
    // This test specifically catches the sync timeout error that occurs
    // when Zero fails to sync organization data after creation

    await signUpNewUser(page);
    await waitForDashboardStable(page, 30_000);

    // Check for sync timeout error (this should NOT appear with the fix)
    const syncTimeoutError = page.getByText("Sync Timeout");
    const hasTimeoutError = await syncTimeoutError
      .isVisible()
      .catch(() => false);

    if (hasTimeoutError) {
      // If we hit this, the bug is still present
      console.error("❌ Sync timeout error detected - bug is NOT fixed!");
    }

    expect(hasTimeoutError).toBe(false);
  });
});
