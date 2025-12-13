import { expect, test } from "@playwright/test";
import { signUpNewUser } from "./helpers";

const _DASHBOARD_URL_PATTERN = /\/dashboard/;
const ORG_DASHBOARD_URL_PATTERN = /\/dashboard\/[^/]+$/;
const ACCOUNT_URL_PATTERN = /\/dashboard\/account/;

const TAGS_URL_PATTERN = /\/tags/;
const CHANGELOG_URL_PATTERN = /\/changelog/;
const USERS_URL_PATTERN = /\/users/;
const SUBSCRIPTION_URL_PATTERN = /\/subscription/;
const SETTINGS_URL_PATTERN = /\/settings/;

const NEW_BOARD_URL_PATTERN = /\/dashboard\/[^/]+\/board-/;

const PUBLISH_ORG_PATTERN = /Publish Organization/i;

// Signup + Zero sync can be slow in CI; allow longer per test.
/**
 * Navigation tests validate the sidebar navigation and routing within the dashboard.
 * These tests require an authenticated user.
 */
test.describe("Dashboard Navigation", () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear cookies to ensure fresh state
    await context.clearCookies();

    // Sign up a new user for each test
    await signUpNewUser(page, {
      name: "Nav Test User",
      email: `nav-test+${Date.now()}@example.com`,
    });

    // Verify sidebar is visible
    await expect(page.locator("aside")).toBeVisible({ timeout: 10_000 });
  });

  test("sidebar shows dashboard link", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("sidebar shows boards section header", async ({ page }) => {
    // Use the button role since Boards is a collapsible section
    await expect(page.getByRole("button", { name: "Boards" })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("sidebar shows admin section", async ({ page }) => {
    // Use exact match since "Admin" appears in multiple places
    await expect(page.getByText("Admin", { exact: true })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can navigate to tags page", async ({ page }) => {
    // Use exact match for the sidebar link
    await page.getByRole("link", { name: "Tags", exact: true }).click();
    await expect(page).toHaveURL(TAGS_URL_PATTERN);
    await expect(page.getByRole("heading", { name: "Tags" })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can navigate to changelog page", async ({ page }) => {
    await page.getByRole("link", { name: "Changelog" }).click();
    await expect(page).toHaveURL(CHANGELOG_URL_PATTERN);
    await expect(page.getByRole("heading", { name: "Changelog" })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can navigate to users page", async ({ page }) => {
    // Use exact match for the sidebar link
    await page.getByRole("link", { name: "Users", exact: true }).click();
    await expect(page).toHaveURL(USERS_URL_PATTERN);
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can navigate to subscription page", async ({ page }) => {
    await page.getByRole("link", { name: "Subscription" }).click();
    await expect(page).toHaveURL(SUBSCRIPTION_URL_PATTERN);
    // Check for the heading specifically
    await expect(
      page.getByRole("heading", { name: "Subscription" })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("can navigate to settings page", async ({ page }) => {
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(SETTINGS_URL_PATTERN);
    // Check for the Organization Settings heading
    await expect(
      page.getByRole("heading", { name: "Organization Settings" })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("sidebar shows user name", async ({ page }) => {
    // User name should be visible in the sidebar user section
    await expect(page.getByRole("link", { name: "Nav Test User" })).toBeVisible(
      { timeout: 10_000 }
    );
  });

  test("can click user link to go to account", async ({ page }) => {
    // Click on the user link in sidebar
    await page.getByRole("link", { name: "Nav Test User" }).click();
    await expect(page).toHaveURL(ACCOUNT_URL_PATTERN);
  });
});

test.describe("Board Navigation", () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear cookies to ensure fresh state
    await context.clearCookies();

    // Sign up a new user
    await signUpNewUser(page, {
      name: "Board Nav User",
      email: `board-nav+${Date.now()}@example.com`,
    });

    // Verify sidebar is visible
    await expect(page.locator("aside")).toBeVisible({ timeout: 10_000 });
  });

  test("shows no boards message when empty", async ({ page }) => {
    // Check for "No boards yet" heading on the main page
    await expect(
      page.getByRole("heading", { name: "No boards yet" })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows add board button in sidebar", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Add board" })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can create board from sidebar", async ({ page }) => {
    // Click "Add board" in sidebar
    await page.getByRole("button", { name: "Add board" }).click();

    // Should navigate to the new board
    await expect(page).toHaveURL(NEW_BOARD_URL_PATTERN, { timeout: 10_000 });
  });

  test("new board appears in sidebar", async ({ page }) => {
    // Create a board
    await page.getByRole("button", { name: "Add board" }).click();
    await expect(page).toHaveURL(NEW_BOARD_URL_PATTERN, { timeout: 10_000 });

    // Board should appear in sidebar (as "Untitled Board" by default)
    await expect(page.locator("aside").getByText("Untitled Board")).toBeVisible(
      { timeout: 10_000 }
    );
  });

  test("sidebar board link navigates to board", async ({ page }) => {
    // Create a board first
    await page.getByRole("button", { name: "Add board" }).click();
    await expect(page).toHaveURL(NEW_BOARD_URL_PATTERN, { timeout: 10_000 });

    // Navigate away to dashboard
    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(ORG_DASHBOARD_URL_PATTERN);

    // Click on board in sidebar
    await page
      .locator("aside")
      .getByRole("link", { name: "Untitled Board" })
      .click();

    // Should navigate back to board
    await expect(page).toHaveURL(NEW_BOARD_URL_PATTERN);
  });
});

test.describe("Public Page Access", () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear cookies to ensure fresh state
    await context.clearCookies();

    // Sign up a new user
    await signUpNewUser(page, {
      name: "Public Page User",
      email: `public-page+${Date.now()}@example.com`,
    });

    // Verify sidebar is visible
    await expect(page.locator("aside")).toBeVisible({ timeout: 10_000 });
  });

  test("shows not published message for new organization", async ({ page }) => {
    // New orgs are not public by default - use specific text
    await expect(page.getByText("Not Published")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("shows publish organization button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: PUBLISH_ORG_PATTERN })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("clicking publish navigates to settings", async ({ page }) => {
    await page.getByRole("button", { name: PUBLISH_ORG_PATTERN }).click();
    await expect(page).toHaveURL(SETTINGS_URL_PATTERN);
  });
});
