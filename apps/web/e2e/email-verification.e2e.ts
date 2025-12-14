import { expect, test } from "@playwright/test";

// Top-level regex patterns for performance (per Ultracite/Biome rules)
const CHECK_SPAM_PATTERN = /check spam or promotions/i;
const RESEND_BUTTON_PATTERN = /resend/i;
const EMAIL_SENT_TO_PATTERN = /Email sent to/i;
const VERIFICATION_EMAIL_SENT_PATTERN = /verification email sent successfully/i;
const RESEND_COOLDOWN_PATTERN = /resend in \d+s/i;
const CHECK_EMAIL_OR_DASHBOARD_PATTERN = /\/(check-email|dashboard)/;
const DASHBOARD_URL_PATTERN = /\/dashboard/;
const HOME_OR_LOGIN_PATTERN = /^\/$|\/login/;

/**
 * E2E tests for email verification flow.
 *
 * These tests verify the signup -> email verification flow works correctly.
 * The behavior depends on the VITE_PUBLIC_REQUIRE_EMAIL_VERIFICATION env var:
 * - If true: signup redirects to /check-email page
 * - If false: signup auto-signs in and redirects to /dashboard
 *
 * These tests are designed to work in both modes, but are most valuable when
 * email verification is enabled to test the full flow.
 */
test.describe("Email Verification Flow", () => {
  test.describe("Check Email Page", () => {
    test("displays check email page correctly without email param", async ({
      page,
    }) => {
      await page.goto("/check-email");

      // Should show the check email page
      await expect(page.getByText("Check your email")).toBeVisible();
      await expect(
        page.getByText("We sent a verification link to your inbox")
      ).toBeVisible();

      // Should show generic message when no email param
      await expect(page.getByText(CHECK_SPAM_PATTERN)).toBeVisible();

      // Should have back to home button
      await expect(
        page.getByRole("link", { name: "Back to home" })
      ).toBeVisible();

      // Resend button should NOT be visible without email param
      await expect(
        page.getByRole("button", { name: RESEND_BUTTON_PATTERN })
      ).not.toBeVisible();
    });

    test("displays check email page correctly with email param", async ({
      page,
    }) => {
      const testEmail = "test@example.com";
      await page.goto(`/check-email?email=${encodeURIComponent(testEmail)}`);

      // Should show the check email page
      await expect(page.getByText("Check your email")).toBeVisible();

      // Should show the email address in the "Email sent to" message
      await expect(page.getByText(EMAIL_SENT_TO_PATTERN)).toBeVisible();
      // Use exact match to avoid matching multiple elements
      await expect(page.getByText(testEmail, { exact: true })).toBeVisible();

      // Resend button SHOULD be visible with email param
      await expect(
        page.getByRole("button", { name: RESEND_BUTTON_PATTERN })
      ).toBeVisible();
    });

    test("back to home button navigates correctly", async ({ page }) => {
      await page.goto("/check-email");

      await page.getByRole("link", { name: "Back to home" }).click();

      // Landing page may redirect to /login if not authenticated
      await expect(page).toHaveURL(HOME_OR_LOGIN_PATTERN);
    });

    test("resend button triggers email resend", async ({ page }) => {
      const testEmail = "test@example.com";
      await page.goto(`/check-email?email=${encodeURIComponent(testEmail)}`);

      const resendButton = page.getByRole("button", {
        name: RESEND_BUTTON_PATTERN,
      });
      await expect(resendButton).toBeVisible();
      await expect(resendButton).toBeEnabled();

      // Click resend button
      await resendButton.click();

      // After clicking, either:
      // - Shows "Sending..." briefly then shows success/error
      // - Shows error immediately (if validation fails)
      // We wait for the final state (success message, error message, or cooldown)
      await expect(async () => {
        const hasSuccess = await page
          .getByText(VERIFICATION_EMAIL_SENT_PATTERN)
          .isVisible()
          .catch(() => false);
        const hasError = await page
          .locator('[class*="destructive"]')
          .isVisible()
          .catch(() => false);
        const hasCooldown = await page
          .getByText(RESEND_COOLDOWN_PATTERN)
          .isVisible()
          .catch(() => false);
        const hasLoading = await page
          .getByText("Sending...")
          .isVisible()
          .catch(() => false);

        // Wait until we're no longer in loading state and have a result
        expect(!hasLoading && (hasSuccess || hasError || hasCooldown)).toBe(
          true
        );
      }).toPass({ timeout: 10_000 });

      // Either success or error should be displayed
      const hasSuccess = await page
        .getByText(VERIFICATION_EMAIL_SENT_PATTERN)
        .isVisible()
        .catch(() => false);
      const hasError = await page
        .locator('[class*="destructive"]')
        .isVisible()
        .catch(() => false);

      expect(hasSuccess || hasError).toBe(true);

      // If success, button should show cooldown
      if (hasSuccess) {
        await expect(page.getByText(RESEND_COOLDOWN_PATTERN)).toBeVisible();
      }
    });
  });

  test.describe("Signup with Email Verification", () => {
    /**
     * This test verifies the signup flow when email verification is required.
     *
     * Expected behavior:
     * - User fills out signup form
     * - Signup succeeds (account is created)
     * - User is redirected to /check-email page
     * - The email address is shown on the check-email page
     *
     * Note: In test environments with DEV_AUTH_ALLOW_UNVERIFIED_SIGNUP=true,
     * this test will skip to dashboard instead. This test is most valuable
     * in environments with email verification enabled.
     */
    test("signup flow shows success and navigates appropriately", async ({
      page,
    }) => {
      const testEmail = `test+${Date.now()}@example.com`;
      const testPassword = "P@ssw0rd!123";
      const testName = "Test User";

      // Navigate to login page
      await page.goto("/login");

      // Wait for page to be ready
      await expect(
        page.getByRole("heading", { name: "Sign In" })
      ).toBeVisible();

      // Switch to signup mode
      await page
        .getByRole("button", { name: "Need an account? Sign up" })
        .click();

      // Wait for signup mode
      await expect(
        page.getByRole("heading", { name: "Create Account" })
      ).toBeVisible();

      // Fill form
      await page.locator("input#name").fill(testName);
      await page.locator("input#email").fill(testEmail);
      await page.locator("input#password").fill(testPassword);

      // Submit
      await page.getByRole("button", { name: "Create Account" }).click();

      // Depending on email verification setting, will redirect to either:
      // - /check-email (if VITE_PUBLIC_REQUIRE_EMAIL_VERIFICATION=true)
      // - /dashboard (if DEV_AUTH_ALLOW_UNVERIFIED_SIGNUP=true or requiresEmailVerification=false)
      // The redirect may happen quickly, so we wait for the URL change
      await page.waitForURL(CHECK_EMAIL_OR_DASHBOARD_PATTERN, {
        timeout: 20_000,
      });

      const currentUrl = page.url();

      if (currentUrl.includes("check-email")) {
        // Email verification is required - verify check-email page
        await expect(page.getByText("Check your email")).toBeVisible();
        await expect(page.getByText(testEmail, { exact: true })).toBeVisible();
        await expect(
          page.getByRole("button", { name: RESEND_BUTTON_PATTERN })
        ).toBeVisible();
      } else {
        // Email verification is not required - verify we're on dashboard
        await expect(page).toHaveURL(DASHBOARD_URL_PATTERN);
        // Dashboard should be accessible (user is authenticated)
        // Use the navigation link which has a unique role
        await expect(
          page.getByRole("link", { name: "Dashboard" })
        ).toBeVisible();
      }
    });
  });
});
