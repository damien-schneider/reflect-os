import { expect, test } from "@playwright/test";

/**
 * Example E2E test using Playwright
 * Tests user flows across the application
 * Run with: npm run e2e
 * Run in headed mode: npm run e2e:headed
 */

const TITLE_REGEX = /.*/;

test.describe("Example E2E Tests", () => {
  test("homepage loads successfully", async ({ page }) => {
    await page.goto("/");
    // Add assertions here
    await expect(page).toHaveTitle(TITLE_REGEX);
  });

  test("navigation works", async ({ page }) => {
    await page.goto("/");
    // Example: click a navigation link
    // await page.click('a[href="/about"]');
    // await expect(page).toHaveURL(/.*about/);
  });
});
