import { expect, test } from "@playwright/test";
import { signUpNewUser } from "./helpers";

const _DASHBOARD_URL_PATTERN = /\/dashboard/;
const _ORG_DASHBOARD_URL_PATTERN = /\/dashboard\/[^/]+$/;
const ACCOUNT_URL_PATTERN = /\/dashboard\/account/;

const TAGS_URL_PATTERN = /\/tags/;
const CHANGELOG_URL_PATTERN = /\/changelog/;
const USERS_URL_PATTERN = /\/users/;
const SUBSCRIPTION_URL_PATTERN = /\/subscription/;
const SETTINGS_URL_PATTERN = /\/settings/;
const BOARDS_URL_PATTERN = /\/boards$/;

const NEW_BOARD_URL_PATTERN = /\/dashboard\/[^/]+\/board-/;

const PUBLISH_ORG_PATTERN = /Publish Organization/i;

/**
 * Helper to ensure sidebar is visible, opening it on mobile if needed.
 * On mobile (viewport < 768px), sidebar is hidden and requires clicking the trigger.
 */
async function ensureSidebarVisible(
  page: import("@playwright/test").Page,
  isMobile: boolean
): Promise<void> {
  if (isMobile) {
    // On mobile, need to click the sidebar trigger first
    const sidebarTrigger = page.locator("button[data-sidebar='trigger']");
    // Wait for trigger to be visible
    await expect(sidebarTrigger).toBeVisible({ timeout: 10_000 });
    await sidebarTrigger.click();
    // Wait for sidebar sheet to open
    await expect(page.locator("[data-sidebar='sidebar']")).toBeVisible({
      timeout: 5000,
    });
  } else {
    // On desktop, sidebar should be visible directly
    await expect(page.locator("aside")).toBeVisible({ timeout: 10_000 });
  }
}

// Signup + Zero sync can be slow in CI; allow longer per test.
/**
 * Navigation tests validate the sidebar navigation and routing within the dashboard.
 * These tests require an authenticated user.
 */
test.describe("Dashboard Navigation", () => {
  test.beforeEach(async ({ page, context }, testInfo) => {
    // Clear cookies to ensure fresh state
    await context.clearCookies();

    // Sign up a new user for each test
    await signUpNewUser(page, {
      name: "Nav Test User",
      email: `nav-test+${Date.now()}@example.com`,
    });

    // Check if running on mobile
    const isMobile = testInfo.project.name.includes("Mobile");

    // Verify sidebar is visible (open it on mobile)
    await ensureSidebarVisible(page, isMobile);
  });

  test("sidebar shows dashboard link", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("sidebar shows boards link", async ({ page }) => {
    // Use exact match since Boards appears as link text only
    await expect(
      page.getByRole("link", { name: "Boards", exact: true })
    ).toBeVisible({
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
    await expect(
      page.getByRole("heading", { name: "Manage Tags" })
    ).toBeVisible({
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
    await expect(
      page.getByRole("heading", { name: "User Management" })
    ).toBeVisible({
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
    // Settings is now a direct link in the main navigation
    await page.getByRole("link", { name: "Settings", exact: true }).click();
    await expect(page).toHaveURL(SETTINGS_URL_PATTERN);
    // Check for the Organization Settings heading
    await expect(
      page.getByRole("heading", { name: "Organization Settings" })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("sidebar shows user name", async ({ page }) => {
    // User name should be visible in the sidebar footer user section (exact match to avoid org selector)
    await expect(
      page.getByRole("button", { name: "Nav Test User", exact: true })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("can click user link to go to account", async ({ page }) => {
    // Click on the user dropdown button in sidebar footer (exact match to avoid org selector)
    await page
      .getByRole("button", { name: "Nav Test User", exact: true })
      .click();
    // Then click Account in the dropdown
    await page.getByRole("menuitem", { name: "Account" }).click();
    await expect(page).toHaveURL(ACCOUNT_URL_PATTERN);
  });
});

test.describe("Board Navigation", () => {
  test.beforeEach(async ({ page, context }, testInfo) => {
    // Clear cookies to ensure fresh state
    await context.clearCookies();

    // Sign up a new user
    await signUpNewUser(page, {
      name: "Board Nav User",
      email: `board-nav+${Date.now()}@example.com`,
    });

    // Check if running on mobile
    const isMobile = testInfo.project.name.includes("Mobile");

    // Verify sidebar is visible (open it on mobile)
    await ensureSidebarVisible(page, isMobile);
  });

  test("can navigate to boards page", async ({ page }) => {
    // Click on Boards link in sidebar
    await page.getByRole("link", { name: "Boards" }).click();
    await expect(page).toHaveURL(BOARDS_URL_PATTERN);
    // Check for the main Boards heading (h1)
    await expect(
      page.getByRole("heading", { name: "Boards", level: 1 })
    ).toBeVisible({
      timeout: 10_000,
    });
  });

  test("shows no boards message on boards page when empty", async ({
    page,
  }) => {
    // Navigate to boards page
    await page.getByRole("link", { name: "Boards" }).click();
    await expect(page).toHaveURL(BOARDS_URL_PATTERN);

    // Check for "No boards yet" heading on the boards page
    await expect(
      page.getByRole("heading", { name: "No boards yet" })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows create board button on boards page", async ({ page }) => {
    // Navigate to boards page
    await page.getByRole("link", { name: "Boards" }).click();
    await expect(page).toHaveURL(BOARDS_URL_PATTERN);

    // The "Create Board" button should be visible
    await expect(
      page.getByRole("button", { name: "Create Board" })
    ).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can create board from boards page", async ({ page }) => {
    // Navigate to boards page
    await page.getByRole("link", { name: "Boards" }).click();
    await expect(page).toHaveURL(BOARDS_URL_PATTERN);

    // Click "Create Board" or "Create Your First Board" button
    const createButton =
      page.getByRole("button", { name: "Create Board" }).first() ||
      page.getByRole("button", { name: "Create Your First Board" });
    await createButton.click();

    // Should navigate to the new board
    await expect(page).toHaveURL(NEW_BOARD_URL_PATTERN, { timeout: 10_000 });
  });

  test("new board appears on boards page", async ({ page }, testInfo) => {
    // Navigate to boards page
    await page.getByRole("link", { name: "Boards", exact: true }).click();
    await expect(page).toHaveURL(BOARDS_URL_PATTERN);

    // Create a board
    const createButton =
      page.getByRole("button", { name: "Create Board" }).first() ||
      page.getByRole("button", { name: "Create Your First Board" });
    await createButton.click();
    await expect(page).toHaveURL(NEW_BOARD_URL_PATTERN, { timeout: 10_000 });

    // Check if running on mobile
    const isMobile = testInfo.project.name.includes("Mobile");

    // Navigate back to boards page via main sidebar
    if (isMobile) {
      await ensureSidebarVisible(page, isMobile);
    }
    // Use first() to get main sidebar link, not secondary sidebar
    await page
      .getByRole("link", { name: "Boards", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(BOARDS_URL_PATTERN);

    // Board should appear on the boards page (as "Untitled Board" by default)
    // Use first() since there may be multiple instances (card link and page title)
    await expect(page.getByText("Untitled Board").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can navigate to board from boards page", async ({ page }, testInfo) => {
    // Navigate to boards page
    await page.getByRole("link", { name: "Boards", exact: true }).click();
    await expect(page).toHaveURL(BOARDS_URL_PATTERN);

    // Create a board first
    const createButton =
      page.getByRole("button", { name: "Create Board" }).first() ||
      page.getByRole("button", { name: "Create Your First Board" });
    await createButton.click();
    await expect(page).toHaveURL(NEW_BOARD_URL_PATTERN, { timeout: 10_000 });

    // Check if running on mobile
    const isMobile = testInfo.project.name.includes("Mobile");

    // Navigate back to boards page via main sidebar
    if (isMobile) {
      await ensureSidebarVisible(page, isMobile);
    }
    // Use first() to get main sidebar link, not secondary sidebar
    await page
      .getByRole("link", { name: "Boards", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(BOARDS_URL_PATTERN);

    // Click on board to navigate to it
    await page.getByRole("link", { name: "View Board" }).click();

    // Should navigate to board
    await expect(page).toHaveURL(NEW_BOARD_URL_PATTERN);
  });
});

test.describe("Public Page Access", () => {
  test.beforeEach(async ({ page, context }, testInfo) => {
    // Clear cookies to ensure fresh state
    await context.clearCookies();

    // Sign up a new user
    await signUpNewUser(page, {
      name: "Public Page User",
      email: `public-page+${Date.now()}@example.com`,
    });

    // Check if running on mobile
    const isMobile = testInfo.project.name.includes("Mobile");

    // Verify sidebar is visible (open it on mobile)
    await ensureSidebarVisible(page, isMobile);
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
