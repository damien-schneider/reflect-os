import { expect, test } from "@playwright/test";
import { signUpNewUser } from "./helpers";

const DASHBOARD_URL_PATTERN = /\/dashboard/;

// Extend timeout for all tests (25 seconds max per test)
test.describe("Authentication", () => {
  test.describe("Login", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
    });

    test("shows login form by default", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: "Sign In", level: 1 })
      ).toBeVisible();
      await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
    });

    test("shows validation error for empty email", async ({ page }) => {
      await page.locator('input[type="password"]').fill("somepassword");
      await page.getByRole("button", { name: "Sign In" }).click();

      await expect(page.getByText("Enter your email address")).toBeVisible();
    });

    test("shows validation error for empty password", async ({ page }) => {
      await page
        .getByRole("textbox", { name: "Email" })
        .fill("test@example.com");
      await page.getByRole("button", { name: "Sign In" }).click();

      await expect(page.getByText("Enter your password")).toBeVisible();
    });

    test("shows validation error for short password", async ({ page }) => {
      await page
        .getByRole("textbox", { name: "Email" })
        .fill("test@example.com");
      await page.locator('input[type="password"]').fill("12345");
      await page.getByRole("button", { name: "Sign In" }).click();

      await expect(
        page.getByText("Password must be at least 6 characters")
      ).toBeVisible();
    });

    test("can toggle between sign in and sign up modes", async ({ page }) => {
      // Should start in sign in mode
      await expect(
        page.getByRole("heading", { name: "Sign In", level: 1 })
      ).toBeVisible();
      await expect(page.locator("input#name")).not.toBeVisible();

      // Toggle to sign up
      await page
        .getByRole("button", { name: "Need an account? Sign up" })
        .click();
      await expect(
        page.getByRole("heading", { name: "Create Account", level: 1 })
      ).toBeVisible();
      await expect(page.locator("input#name")).toBeVisible();

      // Toggle back to sign in
      await page
        .getByRole("button", { name: "Already have an account? Sign in" })
        .click();
      await expect(
        page.getByRole("heading", { name: "Sign In", level: 1 })
      ).toBeVisible();
    });
  });

  test.describe("Sign Up", () => {
    test("shows validation error when name is missing", async ({ page }) => {
      await page.goto("/login");
      await page
        .getByRole("button", { name: "Need an account? Sign up" })
        .click();

      await page
        .getByRole("textbox", { name: "Email" })
        .fill("test@example.com");
      await page.locator('input[type="password"]').fill("password123");
      await page.getByRole("button", { name: "Create Account" }).click();

      await expect(page.getByText("Enter your name")).toBeVisible();
    });

    test("creates an account and redirects to dashboard", async ({ page }) => {
      await signUpNewUser(page, { name: "Playwright User" });

      await expect(page).toHaveURL(DASHBOARD_URL_PATTERN);
      await expect(page.locator("aside")).toBeVisible({ timeout: 5000 });
    });
  });
});
