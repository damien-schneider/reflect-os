import { expect, test } from "@playwright/test";
import { signUpNewUser } from "./helpers";

const BOARDS_URL_PATTERN = /\/boards$/;
const NEW_BOARD_URL_PATTERN = /\/dashboard\/[^/]+\/board-/;

/**
 * Helper to ensure sidebar is visible, opening it on mobile if needed.
 */
async function ensureSidebarVisible(
  page: import("@playwright/test").Page,
  isMobile: boolean
): Promise<void> {
  if (isMobile) {
    const sidebarTrigger = page.locator("button[data-sidebar='trigger']");
    await expect(sidebarTrigger).toBeVisible({ timeout: 10_000 });
    await sidebarTrigger.click();
    await expect(page.locator("[data-sidebar='sidebar']")).toBeVisible({
      timeout: 5000,
    });
  } else {
    await expect(page.locator("aside")).toBeVisible({ timeout: 10_000 });
  }
}

test.describe("Roadmap Scroll Behavior", () => {
  test.beforeEach(async ({ page, context }, testInfo) => {
    // Clear cookies to ensure fresh state
    await context.clearCookies();

    // Sign up a new user
    await signUpNewUser(page, {
      name: "Roadmap Scroll User",
      email: `roadmap-scroll+${Date.now()}@example.com`,
    });

    // Check if running on mobile
    const isMobile = testInfo.project.name.includes("Mobile");

    // Verify sidebar is visible (open it on mobile)
    await ensureSidebarVisible(page, isMobile);
  });

  test("roadmap view should not cause horizontal window scroll", async ({
    page,
  }) => {
    // Navigate to boards page
    await page.getByRole("link", { name: "Boards", exact: true }).click();
    await expect(page).toHaveURL(BOARDS_URL_PATTERN);

    // Create a new board
    const createButton =
      page.getByRole("button", { name: "Create Board" }).first() ||
      page.getByRole("button", { name: "Create Your First Board" });
    await createButton.click();
    await expect(page).toHaveURL(NEW_BOARD_URL_PATTERN, { timeout: 10_000 });

    // Wait for the board page to load
    await expect(page.getByText("List")).toBeVisible({ timeout: 10_000 });

    // Switch to Roadmap view
    await page.getByRole("radio", { name: "Roadmap view" }).click();

    // Wait for roadmap view to render
    await expect(page.getByText("Backlog")).toBeVisible({ timeout: 10_000 });

    // Check that the window does NOT have horizontal scroll
    // scrollWidth > clientWidth means there's horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      // Check both body and html for horizontal overflow
      const bodyOverflows = body.scrollWidth > body.clientWidth;
      const htmlOverflows = html.scrollWidth > html.clientWidth;
      return bodyOverflows || htmlOverflows;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  test("roadmap columns should be horizontally scrollable inside container", async ({
    page,
  }) => {
    // Navigate to boards page
    await page.getByRole("link", { name: "Boards", exact: true }).click();
    await expect(page).toHaveURL(BOARDS_URL_PATTERN);

    // Create a new board
    const createButton =
      page.getByRole("button", { name: "Create Board" }).first() ||
      page.getByRole("button", { name: "Create Your First Board" });
    await createButton.click();
    await expect(page).toHaveURL(NEW_BOARD_URL_PATTERN, { timeout: 10_000 });

    // Wait for the board page to load
    await expect(page.getByText("List")).toBeVisible({ timeout: 10_000 });

    // Switch to Roadmap view
    await page.getByRole("radio", { name: "Roadmap view" }).click();

    // Wait for roadmap view to render
    await expect(page.getByText("Backlog")).toBeVisible({ timeout: 10_000 });

    // Find the roadmap grid container (parent of the columns)
    // It should have overflow-x-auto class
    const roadmapContainer = page.locator(".overflow-x-auto").first();
    await expect(roadmapContainer).toBeVisible({ timeout: 10_000 });

    // Check that the container has horizontal scrollable content
    // (scrollWidth > clientWidth means there's content to scroll)
    const containerInfo = await roadmapContainer.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      canScrollHorizontally: el.scrollWidth > el.clientWidth,
    }));

    // The container should be horizontally scrollable (content wider than viewport)
    // This verifies the roadmap columns are contained within the scroll container
    expect(containerInfo.canScrollHorizontally).toBe(true);
  });
});
