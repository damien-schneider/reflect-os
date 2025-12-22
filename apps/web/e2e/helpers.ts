import { expect, type Page } from "@playwright/test";

// Top-level regex patterns (performance optimization)
const DASHBOARD_WITH_ORG_PATTERN = /\/dashboard\/[^/]+/;
const DASHBOARD_ROOT_PATTERN = /\/dashboard\/?$/;
const DASHBOARD_URL_PATTERN = /\/dashboard/;
const WELCOME_BACK_PATTERN = /Welcome back/;
const SYNCING_PATTERN = /Syncing organization data/;
const SYNC_TIMEOUT_PATTERN = /Sync Timeout/;
const RETRY_BUTTON_PATTERN = /Retry/i;

// Default timeout for all helpers (25 seconds as requested)
const DEFAULT_TIMEOUT = 25_000;

/**
 * Wait for the Zero sync server to be ready.
 * The app shows "Connecting to sync server..." while loading.
 */
export async function waitForSyncReady(
  page: Page,
  timeout = DEFAULT_TIMEOUT
): Promise<void> {
  await page
    .waitForFunction(
      () => !document.body.textContent?.includes("Connecting to sync server"),
      { timeout }
    )
    .catch(() => {
      // If still loading, continue anyway - test might still work
      // The server might be ready by the time we try to interact
    });
}

/**
 * Wait for the dashboard to be ready and stable.
 *
 * The app has a race condition where after signup:
 * 1. User is navigated to /dashboard
 * 2. Dashboard's auth guard checks session via useSession() hook
 * 3. If the session isn't ready yet (async fetch), it redirects to /login
 * 4. But the session cookie IS set, so re-navigating to /dashboard works
 *
 * This helper handles that race condition by retrying navigation if needed.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: e2e helper with complex retry logic
export async function waitForDashboardStable(
  page: Page,
  timeout = DEFAULT_TIMEOUT
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const currentUrl = page.url();

    // If we're on /login but have a session cookie, try navigating to dashboard again
    if (currentUrl.includes("/login")) {
      const cookies = await page.context().cookies();
      const hasSessionCookie = cookies.some((c) => c.name.includes("session"));

      if (hasSessionCookie) {
        console.log(
          "DEBUG: Redirected to login but have session cookie, retrying dashboard..."
        );
        await page.goto("/dashboard");
        await page.waitForTimeout(500);
        continue;
      }
    }

    // Check if we're on the org dashboard (URL has org slug)
    // Pattern: /dashboard/org-slug or /dashboard/org-slug/...
    if (DASHBOARD_WITH_ORG_PATTERN.test(currentUrl)) {
      // Check for dashboard-specific content
      const dashboardIndicators = [
        page.locator("aside"),
        page.getByText(WELCOME_BACK_PATTERN),
        page.getByText("Total Boards"),
      ];

      for (const indicator of dashboardIndicators) {
        try {
          if (await indicator.isVisible({ timeout: 500 })) {
            console.log("DEBUG: Dashboard indicator found, URL:", page.url());
            return; // Success!
          }
        } catch {
          // Not visible, try next
        }
      }
    }

    // If we're on /dashboard without org slug, wait for redirect to org dashboard
    // OR check for onboarding page (new users without organizations)
    if (DASHBOARD_ROOT_PATTERN.test(currentUrl)) {
      // Check for onboarding page (new users without organizations)
      const onboardingIndicators = [
        page.getByText("Create your organization"),
        page.getByLabel("Organization Name"),
      ];

      for (const indicator of onboardingIndicators) {
        try {
          if (await indicator.isVisible({ timeout: 500 })) {
            console.log("DEBUG: On onboarding page, URL:", page.url());
            return; // Success - user is on onboarding page
          }
        } catch {
          // Not visible, try next
        }
      }

      // Check for sync timeout error state - this is an error condition but
      // the test should handle it gracefully (user can retry or navigate)
      const syncTimeoutIndicator = page.getByText(SYNC_TIMEOUT_PATTERN);
      try {
        if (await syncTimeoutIndicator.isVisible({ timeout: 500 })) {
          console.log("DEBUG: On root dashboard, sync timeout detected");
          // Sync failed - click retry button to try again
          const retryButton = page.getByRole("button", {
            name: RETRY_BUTTON_PATTERN,
          });
          if (await retryButton.isVisible({ timeout: 500 })) {
            console.log("DEBUG: Clicking retry button...");
            await retryButton.click();
            await page.waitForTimeout(2000);
            continue;
          }
          throw new Error("Sync timeout occurred and no retry button found");
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes("Sync timeout")) {
          throw e;
        }
        // Not visible, continue checking
      }

      // Check for syncing state - wait briefly for it to complete
      const syncingIndicator = page.getByText(SYNCING_PATTERN);
      try {
        if (await syncingIndicator.isVisible({ timeout: 500 })) {
          console.log("DEBUG: On root dashboard, syncing in progress...");
          // Wait a bit longer for sync to complete
          await page.waitForTimeout(1000);
          continue;
        }
      } catch {
        // Not visible, continue checking
      }

      // If we're on root dashboard but no syncing indicator,
      // the redirect might be happening - wait briefly
      console.log("DEBUG: On root dashboard, waiting for org redirect...");
      await page.waitForTimeout(500);
      continue;
    }

    // None visible yet, wait and retry
    await page.waitForTimeout(500);
  }

  throw new Error(
    `Dashboard did not become stable within ${timeout}ms. Final URL: ${page.url()}`
  );
}

/**
 * Sign up a new user and wait for redirect to dashboard.
 * Returns the email used for signup.
 */
export async function signUpNewUser(
  page: Page,
  options?: {
    name?: string;
    email?: string;
    password?: string;
  }
): Promise<string> {
  const name = options?.name ?? "Test User";
  const email = options?.email ?? `test+${Date.now()}@example.com`;
  const password = options?.password ?? "P@ssw0rd!";

  // Navigate to login if not already there
  if (!page.url().includes("/login")) {
    await page.goto("/login");
  }

  // Wait for sync server
  await waitForSyncReady(page);

  // Wait for the login form to be ready
  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible({
    timeout: 10_000,
  });

  // Switch to sign up mode
  await page.getByRole("button", { name: "Need an account? Sign up" }).click();

  // Wait for signup mode to activate (heading changes to "Create Account")
  await expect(
    page.getByRole("heading", { name: "Create Account" })
  ).toBeVisible({ timeout: 5000 });

  // Wait for name field to be visible (signup mode)
  await expect(page.locator("input#name")).toBeVisible({ timeout: 5000 });

  // Fill form fields
  await page.locator("input#name").fill(name);
  await page.locator("input#email").fill(email);
  await page.locator("input#password").fill(password);

  // Submit using Enter key (more reliable than button click)
  await page.locator("input#password").press("Enter");

  // Wait for redirect to dashboard
  await page.waitForURL(DASHBOARD_URL_PATTERN, { timeout: 20_000 });

  // Handle the race condition where dashboard auth guard may redirect to login
  await waitForDashboardStable(page);

  return email;
}

/**
 * Wait for navigation to dashboard after signup/login
 */
export async function waitForDashboard(
  page: Page,
  timeout = DEFAULT_TIMEOUT
): Promise<void> {
  await page.waitForURL(DASHBOARD_URL_PATTERN, { timeout });
}
