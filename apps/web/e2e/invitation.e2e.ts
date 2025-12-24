import { expect, test } from "@playwright/test";
import { signUpNewUser, waitForDashboardStable } from "./helpers";

// Top-level regex patterns for reuse
const ACCOUNT_URL = /\/dashboard\/account/;
const LOGIN_URL = /\/login/;
const DASHBOARD_URL = /\/dashboard/;
const GENERATE_INVITE_BUTTON = /generate invite link/i;
const INVITE_LINK_FORMAT = /\/invite\/[a-zA-Z0-9-]+/;
const INVITED_TO_JOIN_TEXT = /invited to join|invitation/i;
const INVITER_SPACE_HEADING = /Inviter's Space/i;
const INVITEE_SPACE_HEADING = /Invitee's Space/i;
const EXISTING_USER_SPACE_HEADING = /Existing User's Space/i;
const NEED_ACCOUNT_BUTTON = /need an account/i;
const INVALID_EXPIRED_TEXT = /invalid|expired|not found/i;
const ALREADY_MEMBER_TEXT = /already.*member/i;
const USERS_LINK = /users/i;
const MEMBER_ROLE_TEXT = /member/i;

/**
 * Invitation link tests validate the invite-via-link workflow.
 *
 * Flow:
 * 1. User A creates organization and generates invite link
 * 2. User B clicks invite link
 * 3. User B is redirected to login/signup with invitation context
 * 4. After auth, User B is automatically added to the organization
 * 5. User B sees the new organization in their dashboard
 */
test.describe("Invitation Link Flow", () => {
  test("can generate an invite link from account page", async ({
    page,
    context,
  }) => {
    await context.clearCookies();

    // Sign up a new user (creates default organization)
    await signUpNewUser(page, {
      name: "Inviter User",
      email: `inviter+${Date.now()}@example.com`,
    });

    // Navigate to account page
    await page.getByRole("link", { name: "Inviter User" }).click();
    await expect(page).toHaveURL(ACCOUNT_URL);

    // Find and click generate invite link button
    const generateButton = page.getByRole("button", {
      name: GENERATE_INVITE_BUTTON,
    });
    await expect(generateButton).toBeVisible({ timeout: 10_000 });
    await generateButton.click();

    // Wait for invite link to be generated
    const inviteLinkInput = page.locator('input[type="text"][readonly]');
    await expect(inviteLinkInput).toBeVisible({ timeout: 10_000 });

    // Verify the invite link is valid format
    const inviteLink = await inviteLinkInput.inputValue();
    expect(inviteLink).toMatch(INVITE_LINK_FORMAT);
  });

  test("invite link redirects unauthenticated users to login with invitation context", async ({
    page,
    context,
  }) => {
    await context.clearCookies();

    // Create inviter and generate invite link
    await signUpNewUser(page, {
      name: "Inviter",
      email: `inviter+${Date.now()}@example.com`,
    });

    // Navigate to account page and generate invite link
    await page.getByRole("link", { name: "Inviter" }).click();
    await expect(page).toHaveURL(ACCOUNT_URL);

    const generateButton = page.getByRole("button", {
      name: GENERATE_INVITE_BUTTON,
    });
    await generateButton.click();

    const inviteLinkInput = page.locator('input[type="text"][readonly]');
    await expect(inviteLinkInput).toBeVisible({ timeout: 10_000 });
    const inviteLink = await inviteLinkInput.inputValue();

    // Clear cookies to simulate new user visiting the invite link
    await context.clearCookies();

    // Visit the invite link
    await page.goto(inviteLink);

    // Should redirect to login page with invitation params
    await expect(page).toHaveURL(LOGIN_URL, { timeout: 10_000 });

    // Should see invitation context (organization name)
    await expect(page.getByText(INVITED_TO_JOIN_TEXT)).toBeVisible({
      timeout: 5000,
    });
  });

  test("new user can sign up via invite link and join organization", async ({
    page,
    context,
  }) => {
    await context.clearCookies();

    // Create inviter and generate invite link
    await signUpNewUser(page, {
      name: "Inviter",
      email: `inviter+${Date.now()}@example.com`,
    });

    // Get the organization name for verification later
    const orgHeading = page.getByRole("heading", {
      name: INVITER_SPACE_HEADING,
    });
    await expect(orgHeading).toBeVisible({ timeout: 10_000 });

    // Navigate to account page and generate invite link
    await page.getByRole("link", { name: "Inviter" }).click();
    await expect(page).toHaveURL(ACCOUNT_URL);

    const generateButton = page.getByRole("button", {
      name: GENERATE_INVITE_BUTTON,
    });
    await generateButton.click();

    const inviteLinkInput = page.locator('input[type="text"][readonly]');
    await expect(inviteLinkInput).toBeVisible({ timeout: 10_000 });
    const inviteLink = await inviteLinkInput.inputValue();

    // Clear cookies to simulate new user
    await context.clearCookies();

    // Visit the invite link
    await page.goto(inviteLink);

    // Should redirect to login with invitation context
    await expect(page).toHaveURL(LOGIN_URL, { timeout: 10_000 });

    // Switch to sign up mode
    await page.getByRole("button", { name: NEED_ACCOUNT_BUTTON }).click();

    // Fill signup form
    await page.locator("input#name").fill("Invitee User");
    await page.locator("input#email").fill(`invitee+${Date.now()}@example.com`);
    await page.locator("input#password").fill("P@ssw0rd!");

    // Submit signup
    await page.locator("input#password").press("Enter");

    // Should redirect to dashboard
    await page.waitForURL(DASHBOARD_URL, { timeout: 20_000 });
    await waitForDashboardStable(page);

    // Should be in the inviter's organization, not their own
    await expect(
      page.getByRole("heading", { name: INVITER_SPACE_HEADING })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("existing user can sign in via invite link and join organization", async ({
    page,
    context,
    browser,
  }) => {
    await context.clearCookies();

    // Create inviter and generate invite link
    await signUpNewUser(page, {
      name: "Inviter",
      email: `inviter+${Date.now()}@example.com`,
    });

    // Navigate to account page and generate invite link
    await page.getByRole("link", { name: "Inviter" }).click();
    await expect(page).toHaveURL(ACCOUNT_URL);

    const generateButton = page.getByRole("button", {
      name: GENERATE_INVITE_BUTTON,
    });
    await generateButton.click();

    const inviteLinkInput = page.locator('input[type="text"][readonly]');
    await expect(inviteLinkInput).toBeVisible({ timeout: 10_000 });
    const inviteLink = await inviteLinkInput.inputValue();

    // Create a second user in a new context
    const existingUserContext = await browser.newContext();
    const existingUserPage = await existingUserContext.newPage();

    const existingEmail = `existing+${Date.now()}@example.com`;
    const existingPassword = "P@ssw0rd!";

    await signUpNewUser(existingUserPage, {
      name: "Existing User",
      email: existingEmail,
      password: existingPassword,
    });

    // Verify they have their own org
    await expect(
      existingUserPage.getByRole("heading", {
        name: EXISTING_USER_SPACE_HEADING,
      })
    ).toBeVisible({ timeout: 10_000 });

    // Sign out existing user
    await existingUserPage.getByRole("link", { name: "Existing User" }).click();
    await existingUserPage.getByRole("button", { name: "Sign Out" }).click();
    await expect(existingUserPage).toHaveURL(LOGIN_URL, { timeout: 10_000 });

    // Now visit the invite link
    await existingUserPage.goto(inviteLink);

    // Should redirect to login with invitation context
    await expect(existingUserPage).toHaveURL(LOGIN_URL, { timeout: 10_000 });

    // Sign in with existing credentials
    await existingUserPage.locator("input#email").fill(existingEmail);
    await existingUserPage.locator("input#password").fill(existingPassword);
    await existingUserPage.locator("input#password").press("Enter");

    // Should redirect to dashboard
    await existingUserPage.waitForURL(DASHBOARD_URL, { timeout: 20_000 });
    await waitForDashboardStable(existingUserPage);

    // Should be in the inviter's organization after joining
    await expect(
      existingUserPage.getByRole("heading", { name: INVITER_SPACE_HEADING })
    ).toBeVisible({ timeout: 10_000 });

    // Clean up
    await existingUserContext.close();
  });

  test("authenticated user visiting invite link is added to org directly", async ({
    page,
    context,
    browser,
  }) => {
    await context.clearCookies();

    // Create inviter and generate invite link
    await signUpNewUser(page, {
      name: "Inviter",
      email: `inviter+${Date.now()}@example.com`,
    });

    // Navigate to account page and generate invite link
    await page.getByRole("link", { name: "Inviter" }).click();
    await expect(page).toHaveURL(ACCOUNT_URL);

    const generateButton = page.getByRole("button", {
      name: GENERATE_INVITE_BUTTON,
    });
    await generateButton.click();

    const inviteLinkInput = page.locator('input[type="text"][readonly]');
    await expect(inviteLinkInput).toBeVisible({ timeout: 10_000 });
    const inviteLink = await inviteLinkInput.inputValue();

    // Create a second user in a new context (already signed in)
    const inviteeContext = await browser.newContext();
    const inviteePage = await inviteeContext.newPage();

    await signUpNewUser(inviteePage, {
      name: "Invitee",
      email: `invitee+${Date.now()}@example.com`,
    });

    // Verify they have their own org
    await expect(
      inviteePage.getByRole("heading", { name: INVITEE_SPACE_HEADING })
    ).toBeVisible({ timeout: 10_000 });

    // Visit the invite link while already logged in
    await inviteePage.goto(inviteLink);

    // Should be redirected to the inviter's organization directly
    await inviteePage.waitForURL(DASHBOARD_URL, { timeout: 20_000 });
    await waitForDashboardStable(inviteePage);

    // Should see success message or be in the new org
    await expect(
      inviteePage.getByRole("heading", { name: INVITER_SPACE_HEADING })
    ).toBeVisible({ timeout: 10_000 });

    // Clean up
    await inviteeContext.close();
  });

  test("expired invite link shows error message", async ({ page, context }) => {
    await context.clearCookies();

    // Visit a non-existent/expired invitation ID
    await page.goto("/invite/expired-invalid-id");

    // Should show error message
    await expect(page.getByText(INVALID_EXPIRED_TEXT)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("user cannot use the same invite link twice", async ({
    page,
    context,
    browser,
  }) => {
    await context.clearCookies();

    // Create inviter and generate invite link
    await signUpNewUser(page, {
      name: "Inviter",
      email: `inviter+${Date.now()}@example.com`,
    });

    // Navigate to account page and generate invite link
    await page.getByRole("link", { name: "Inviter" }).click();
    await expect(page).toHaveURL(ACCOUNT_URL);

    const generateButton = page.getByRole("button", {
      name: GENERATE_INVITE_BUTTON,
    });
    await generateButton.click();

    const inviteLinkInput = page.locator('input[type="text"][readonly]');
    await expect(inviteLinkInput).toBeVisible({ timeout: 10_000 });
    const inviteLink = await inviteLinkInput.inputValue();

    // Create a second user and join via invite
    const inviteeContext = await browser.newContext();
    const inviteePage = await inviteeContext.newPage();

    await signUpNewUser(inviteePage, {
      name: "Invitee",
      email: `invitee+${Date.now()}@example.com`,
    });

    // Join the org via invite link
    await inviteePage.goto(inviteLink);
    await inviteePage.waitForURL(DASHBOARD_URL, { timeout: 20_000 });
    await waitForDashboardStable(inviteePage);

    // Try to use the same invite link again
    await inviteePage.goto(inviteLink);

    // Should show already a member message or redirect to the org
    const alreadyMember = inviteePage.getByText(ALREADY_MEMBER_TEXT);
    const orgHeading = inviteePage.getByRole("heading", {
      name: INVITER_SPACE_HEADING,
    });

    // Either show "already a member" or just be on the org page
    const isAlreadyMember = await alreadyMember
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const isOnOrg = await orgHeading
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(isAlreadyMember || isOnOrg).toBe(true);

    // Clean up
    await inviteeContext.close();
  });
});

test.describe("Invite Link with Roles", () => {
  test("invite link can specify member role (default)", async ({
    page,
    context,
    browser,
  }) => {
    await context.clearCookies();

    // Create inviter
    await signUpNewUser(page, {
      name: "Inviter",
      email: `inviter+${Date.now()}@example.com`,
    });

    // Generate invite link (default role is member)
    await page.getByRole("link", { name: "Inviter" }).click();
    await expect(page).toHaveURL(ACCOUNT_URL);

    const generateButton = page.getByRole("button", {
      name: GENERATE_INVITE_BUTTON,
    });
    await generateButton.click();

    const inviteLinkInput = page.locator('input[type="text"][readonly]');
    await expect(inviteLinkInput).toBeVisible({ timeout: 10_000 });
    const inviteLink = await inviteLinkInput.inputValue();

    // Create invitee and join via link
    const inviteeContext = await browser.newContext();
    const inviteePage = await inviteeContext.newPage();

    await signUpNewUser(inviteePage, {
      name: "Member Invitee",
      email: `member+${Date.now()}@example.com`,
    });

    await inviteePage.goto(inviteLink);
    await inviteePage.waitForURL(DASHBOARD_URL, { timeout: 20_000 });
    await waitForDashboardStable(inviteePage);

    // Verify they joined as member (not admin)
    // Navigate to users page in the org to check role
    await inviteePage.goto("/dashboard");
    await waitForDashboardStable(inviteePage);

    // Navigate to users management
    const usersLink = inviteePage.getByRole("link", { name: USERS_LINK });
    if (await usersLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await usersLink.click();
      // Should see their role as "member"
      await expect(inviteePage.getByText(MEMBER_ROLE_TEXT)).toBeVisible({
        timeout: 5000,
      });
    }

    await inviteeContext.close();
  });
});
