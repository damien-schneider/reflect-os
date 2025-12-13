import { expect, test } from "@playwright/test";
import { signUpNewUser } from "./helpers";

const _DASHBOARD_URL = /\/dashboard/;
const ACCOUNT_URL = /\/dashboard\/account/;
const LOGIN_URL = /\/login/;

const ORG_SPACE_HEADING = /Org Test User's Space/i;
const ACCOUNT_HEADING = /Org Test User|Account/i;
const SWITCH_SPACE_HEADING = /Switch Test User's Space/i;

/**
 * Organization management tests validate account and organization features.
 * These tests require an authenticated user.
 */
test.describe("Organization Management", () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear cookies to ensure fresh state
    await context.clearCookies();

    // Sign up a new user for each test
    await signUpNewUser(page, {
      name: "Org Test User",
      email: `org-test+${Date.now()}@example.com`,
    });

    // Verify sidebar is visible
    await expect(page.locator("aside")).toBeVisible({ timeout: 10_000 });
  });

  test("can navigate to account page via user link", async ({ page }) => {
    // Click on user link in sidebar to go to account
    await page.getByRole("link", { name: "Org Test User" }).click();
    await expect(page).toHaveURL(ACCOUNT_URL);

    // Should see user info
    await expect(
      page.getByRole("heading", { name: ACCOUNT_HEADING })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("can sign out from account page", async ({ page }) => {
    // Navigate to account
    await page.getByRole("link", { name: "Org Test User" }).click();
    await expect(page).toHaveURL(ACCOUNT_URL);

    // Click Sign Out button
    await page.getByRole("button", { name: "Sign Out" }).click();

    // Should redirect to login page
    await expect(page).toHaveURL(LOGIN_URL, { timeout: 10_000 });
  });

  test("account page shows organizations section", async ({ page }) => {
    // Navigate to account
    await page.getByRole("link", { name: "Org Test User" }).click();
    await expect(page).toHaveURL(ACCOUNT_URL);

    // Should see Organizations heading
    await expect(page.getByText("Organizations")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("new user has a default organization", async ({ page }) => {
    // Dashboard should show the user's organization name
    await expect(
      page.getByRole("heading", { name: ORG_SPACE_HEADING })
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Organization Switching", () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear cookies to ensure fresh state
    await context.clearCookies();

    // Sign up a new user
    await signUpNewUser(page, {
      name: "Switch Test User",
      email: `switch-test+${Date.now()}@example.com`,
    });

    // Verify sidebar is visible
    await expect(page.locator("aside")).toBeVisible({ timeout: 10_000 });
  });

  test("sidebar shows organization name", async ({ page }) => {
    // The sidebar should show the org name as a button
    await expect(
      page.getByRole("button", { name: SWITCH_SPACE_HEADING })
    ).toBeVisible({ timeout: 10_000 });
  });
});
