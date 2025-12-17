import { expect, test } from "@playwright/test";

/**
 * E2E tests for the /api/auth/verify-email endpoint.
 *
 * These tests verify that the verify-email endpoint is accessible and
 * returns appropriate responses (not 404).
 *
 * Issue: Clicking email verification link returns 404 in production.
 * Root cause: Better Auth routing configuration with Hono sub-routes.
 */
test.describe("Verify Email API Endpoint", () => {
  test("verify-email endpoint should not return 404", async ({ request }) => {
    // Make a direct request to the verify-email endpoint
    // We expect it to return an error about invalid token, NOT a 404
    const response = await request.get(
      "/api/auth/verify-email?token=invalid-test-token&callbackURL=/dashboard"
    );

    console.log(`Response status: ${response.status()}`);
    console.log(`Response status text: ${response.statusText()}`);

    // The endpoint should NOT return 404
    // It should return either:
    // - 400 Bad Request (invalid token)
    // - 302 Redirect (to error page or callback)
    // - 200 with error message
    expect(response.status()).not.toBe(404);

    // Log response details for debugging
    const body = await response.text();
    console.log(`Response body (first 500 chars): ${body.substring(0, 500)}`);
  });

  test("sign-in endpoint should not return 404", async ({ request }) => {
    // Test another Better Auth endpoint to verify routing works
    const response = await request.post("/api/auth/sign-in/email", {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        email: "test@example.com",
        password: "test-password",
      },
    });

    console.log(`Response status: ${response.status()}`);

    // Should NOT be 404 - endpoint should exist
    // Will likely return 400 or 401 for invalid credentials
    expect(response.status()).not.toBe(404);
  });

  test("sign-up endpoint should not return 404", async ({ request }) => {
    // Test sign-up endpoint to verify routing works
    const response = await request.post("/api/auth/sign-up/email", {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        email: `test+${Date.now()}@example.com`,
        password: "P@ssw0rd!123",
        name: "Test User",
      },
    });

    console.log(`Response status: ${response.status()}`);

    // Should NOT be 404 - endpoint should exist
    expect(response.status()).not.toBe(404);
  });

  test("get-session endpoint should not return 404", async ({ request }) => {
    // Test get-session endpoint
    const response = await request.get("/api/auth/get-session");

    console.log(`Response status: ${response.status()}`);

    // Should NOT be 404 - will return null or empty session for unauthenticated
    expect(response.status()).not.toBe(404);
  });

  test("verify-email URL from email simulation", async ({ page }) => {
    // Simulate what happens when user clicks the email verification link
    // The link format is: /api/auth/verify-email?token=xxx&callbackURL=yyy

    // First, let's test via page navigation (how users actually access it)
    const verifyUrl =
      "/api/auth/verify-email?token=simulated-invalid-token&callbackURL=/dashboard";

    // Navigate to the URL (this is what happens when user clicks email link)
    await page.goto(verifyUrl);

    // Check that we didn't get a raw 404 page
    const pageContent = await page.content();
    const is404 =
      pageContent.includes("404") &&
      pageContent.toLowerCase().includes("not found");

    console.log(`Page URL after navigation: ${page.url()}`);
    console.log(`Page content includes 404: ${is404}`);

    // If we got a 404, the test should fail
    // Better Auth should redirect to an error page or show an error message
    if (is404) {
      // Log more details for debugging
      console.log(
        `Page content (first 1000 chars): ${pageContent.substring(0, 1000)}`
      );
    }

    // The page should either:
    // 1. Redirect to an error page (with error in URL or shown on page)
    // 2. Show an error message about invalid/expired token
    // 3. Redirect to the callbackURL with an error parameter
    // It should NOT show a raw 404 Not Found page
    expect(is404).toBe(false);
  });
});
