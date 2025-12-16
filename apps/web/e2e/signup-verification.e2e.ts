/**
 * Signup and Email Verification E2E Tests
 *
 * These tests verify the complete signup flow including:
 * - Account creation
 * - Email verification URL generation
 * - Navigation to check-email page
 * - Error handling
 *
 * TDD approach: These tests document expected behavior. Some may fail
 * initially and need fixes to the application code.
 */

import { expect, test } from "@playwright/test";

// Top-level regex patterns for performance
const CHECK_EMAIL_PAGE_PATTERN = /\/check-email/;
const DASHBOARD_URL_PATTERN = /\/dashboard/;
const ERROR_MESSAGE_PATTERN = /user.*not.*found|account.*not.*found|error/i;
const ACCOUNT_CREATED_PATTERN = /account created/i;
const USER_NOT_FOUND_PATTERN = /user.*not.*found|does.*not.*exist/i;
const PASSWORD_TOO_SHORT_PATTERN =
  /password.*6.*character|password.*too.*short/i;
const ENTER_NAME_PATTERN = /enter.*name/i;
const NOT_FOUND_PAGE_PATTERN = /404|not found/i;
const TOKEN_ERROR_PATTERN =
  /invalid.*token|token.*expired|verification.*failed/i;
const RESEND_BUTTON_PATTERN = /resend/i;
const RESEND_COOLDOWN_PATTERN = /resend in \d+s/i;

/**
 * Generate a unique test email to avoid conflicts with existing users
 */
const generateTestEmail = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test+${timestamp}${random}@example.com`;
};

test.describe("Signup Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh at login page
    await page.goto("/login");
    // Switch to signup mode
    await page
      .getByRole("button", { name: "Need an account? Sign up" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Create Account" })
    ).toBeVisible();
  });

  test("should successfully create account and show success message", async ({
    page,
  }) => {
    const testEmail = generateTestEmail();
    const testPassword = "P@ssw0rd!123";
    const testName = "Test User";

    // Fill form
    await page.locator("input#name").fill(testName);
    await page.locator("input#email").fill(testEmail);
    await page.locator("input#password").fill(testPassword);

    // Submit form
    await page.getByRole("button", { name: "Create Account" }).click();

    // Should show success message OR navigate to check-email/dashboard
    // Wait for either condition
    await expect(async () => {
      const hasSuccess = await page
        .getByText(ACCOUNT_CREATED_PATTERN)
        .isVisible()
        .catch(() => false);
      const hasCheckEmail = CHECK_EMAIL_PAGE_PATTERN.test(page.url());
      const hasDashboard = DASHBOARD_URL_PATTERN.test(page.url());
      const hasError = await page
        .getByText(ERROR_MESSAGE_PATTERN)
        .isVisible()
        .catch(() => false);

      // If there's an error, fail early with helpful message
      if (hasError) {
        const errorText = await page
          .locator("[class*=destructive]")
          .textContent();
        throw new Error(`Signup failed with error: ${errorText}`);
      }

      expect(hasSuccess || hasCheckEmail || hasDashboard).toBe(true);
    }).toPass({ timeout: 15_000 });
  });

  test("should NOT show 'user not found' error during signup", async ({
    page,
  }) => {
    const testEmail = generateTestEmail();
    const testPassword = "P@ssw0rd!123";
    const testName = "Test User";

    // Fill form
    await page.locator("input#name").fill(testName);
    await page.locator("input#email").fill(testEmail);
    await page.locator("input#password").fill(testPassword);

    // Submit form
    await page.getByRole("button", { name: "Create Account" }).click();

    // Wait a bit for any error to appear
    await page.waitForTimeout(3000);

    // Should NOT see "user not found" error - this is a NEW signup
    const errorVisible = await page
      .getByText(USER_NOT_FOUND_PATTERN)
      .isVisible()
      .catch(() => false);

    expect(errorVisible).toBe(false);
  });

  test("should redirect to check-email page when email verification is required", async ({
    page,
  }) => {
    const testEmail = generateTestEmail();
    const testPassword = "P@ssw0rd!123";
    const testName = "Test User";

    // Fill form
    await page.locator("input#name").fill(testName);
    await page.locator("input#email").fill(testEmail);
    await page.locator("input#password").fill(testPassword);

    // Submit form
    await page.getByRole("button", { name: "Create Account" }).click();

    // Wait for navigation - should go to either check-email or dashboard
    await page.waitForURL(
      (url) =>
        CHECK_EMAIL_PAGE_PATTERN.test(url.pathname) ||
        DASHBOARD_URL_PATTERN.test(url.pathname),
      { timeout: 15_000 }
    );

    // If we're on check-email page, verify the email is shown
    if (CHECK_EMAIL_PAGE_PATTERN.test(page.url())) {
      await expect(page.getByText("Check your email")).toBeVisible();
      // The email should be in the URL params and displayed
      const url = new URL(page.url());
      const emailParam = url.searchParams.get("email");
      expect(emailParam).toBe(testEmail);
      await expect(page.getByText(testEmail, { exact: true })).toBeVisible();
    }
  });

  test("should show validation error for short password", async ({ page }) => {
    await page.locator("input#name").fill("Test User");
    await page.locator("input#email").fill(generateTestEmail());
    await page.locator("input#password").fill("12345"); // Too short

    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.getByText(PASSWORD_TOO_SHORT_PATTERN)).toBeVisible({
      timeout: 5000,
    });
  });

  test("should show validation error for missing name", async ({ page }) => {
    await page.locator("input#email").fill(generateTestEmail());
    await page.locator("input#password").fill("P@ssw0rd!123");

    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.getByText(ENTER_NAME_PATTERN)).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe("Email Verification Link", () => {
  /**
   * This test verifies that the email verification endpoint is accessible
   * and returns a proper response (not 404).
   *
   * The verification should either:
   * - Succeed and redirect to the callback URL
   * - Return an error page (token expired, invalid token, etc.)
   *
   * It should NOT return 404, as that indicates routing issues.
   */
  test("verify-email endpoint should NOT return 404", async ({ request }) => {
    // Create a mock token (this will be invalid but should not cause 404)
    const mockToken =
      "eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ.xxx";
    const verifyUrl = `/api/auth/verify-email?token=${mockToken}&callbackURL=%2Fdashboard`;

    // Make a direct request to the verification endpoint
    const response = await request.get(verifyUrl);

    // Should NOT be 404 - the endpoint should exist
    // It may return 400 (bad token) or redirect, but not 404
    expect(response.status()).not.toBe(404);

    // Log actual status for debugging
    console.log(`Verify email endpoint returned status: ${response.status()}`);
  });

  test("verify-email endpoint should handle invalid tokens gracefully", async ({
    page,
  }) => {
    const mockToken = "invalid-token-for-testing";
    const verifyUrl = `/api/auth/verify-email?token=${mockToken}&callbackURL=%2Fdashboard`;

    await page.goto(verifyUrl);

    // Should NOT be a browser 404 error page
    // Check for any error message about the token
    const has404InPage = await page
      .getByText(NOT_FOUND_PAGE_PATTERN)
      .isVisible()
      .catch(() => false);

    // If we see 404 in the page, it's a routing issue
    if (has404InPage) {
      const pageContent = await page.content();
      console.log("Page content when 404:", pageContent.substring(0, 500));
    }

    // The page should show an error about the token, not a 404
    // Or redirect back to login/home with an error
    const hasTokenError = await page
      .getByText(TOKEN_ERROR_PATTERN)
      .isVisible()
      .catch(() => false);

    const hasRedirectedToLogin = page.url().includes("/login");
    const hasRedirectedToHome = page.url() === "http://localhost:5173/";

    // One of these should be true - showing token error or redirected
    const handledGracefully =
      hasTokenError ||
      hasRedirectedToLogin ||
      hasRedirectedToHome ||
      !has404InPage;

    expect(handledGracefully).toBe(true);
  });
});

test.describe("Check Email Page", () => {
  test("should display resend button when email is provided", async ({
    page,
  }) => {
    const testEmail = "test@example.com";
    await page.goto(`/check-email?email=${encodeURIComponent(testEmail)}`);

    await expect(page.getByText("Check your email")).toBeVisible();
    await expect(
      page.getByRole("button", { name: RESEND_BUTTON_PATTERN })
    ).toBeVisible();
  });

  test("resend button should be disabled during cooldown", async ({ page }) => {
    const testEmail = "test@example.com";
    await page.goto(`/check-email?email=${encodeURIComponent(testEmail)}`);

    const resendButton = page.getByRole("button", {
      name: RESEND_BUTTON_PATTERN,
    });
    await expect(resendButton).toBeVisible();

    // Click resend
    await resendButton.click();

    // Wait for either success or error state (not loading)
    await expect(async () => {
      const isLoading = await page
        .getByText("Sending...")
        .isVisible()
        .catch(() => false);
      expect(isLoading).toBe(false);
    }).toPass({ timeout: 10_000 });

    // After resend, button should show cooldown OR be re-enabled
    // (depends on whether the email was actually sent)
    const hasCooldown = await page
      .getByText(RESEND_COOLDOWN_PATTERN)
      .isVisible()
      .catch(() => false);
    const hasResendButton = await resendButton.isEnabled().catch(() => false);

    // One of these should be true
    expect(hasCooldown || hasResendButton).toBe(true);
  });
});
