/**
 * Email Verification URL Tests
 *
 * Tests for the transformVerificationUrl function that ensures
 * email verification URLs have the correct callbackURL parameter.
 *
 * These tests verify:
 * - Default "/" callback is replaced with "/dashboard"
 * - Missing callbackURL is set to "/dashboard"
 * - Existing "/dashboard" callback is not modified (preventing double paths)
 * - Custom callbacks are preserved
 * - Invalid URLs are handled gracefully
 */

import { transformVerificationUrl } from "@repo/auth";
import { describe, expect, it } from "vitest";

const BASE_URL = "https://example.com/api/auth/verify-email";
const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ.xxx";

describe("transformVerificationUrl", () => {
  describe("when callbackURL is missing", () => {
    it("should add /dashboard as callbackURL", () => {
      const url = `${BASE_URL}?token=${TOKEN}`;
      const result = transformVerificationUrl(url);

      expect(result.error).toBeUndefined();
      expect(result.originalCallbackURL).toBeNull();

      const parsedResult = new URL(result.url);
      expect(parsedResult.searchParams.get("callbackURL")).toBe("/dashboard");
      expect(parsedResult.searchParams.get("token")).toBe(TOKEN);
    });
  });

  describe("when callbackURL is default /", () => {
    it("should replace / with /dashboard", () => {
      const url = `${BASE_URL}?token=${TOKEN}&callbackURL=/`;
      const result = transformVerificationUrl(url);

      expect(result.error).toBeUndefined();
      expect(result.originalCallbackURL).toBe("/");

      const parsedResult = new URL(result.url);
      expect(parsedResult.searchParams.get("callbackURL")).toBe("/dashboard");
    });

    it("should handle URL-encoded / (%2F)", () => {
      // better-auth encodes the callbackURL, so "/" becomes "%2F"
      const url = `${BASE_URL}?token=${TOKEN}&callbackURL=%2F`;
      const result = transformVerificationUrl(url);

      expect(result.error).toBeUndefined();
      expect(result.originalCallbackURL).toBe("/");

      const parsedResult = new URL(result.url);
      expect(parsedResult.searchParams.get("callbackURL")).toBe("/dashboard");
    });
  });

  describe("when callbackURL is already /dashboard", () => {
    it("should NOT modify the URL (preventing double /dashboarddashboard)", () => {
      const url = `${BASE_URL}?token=${TOKEN}&callbackURL=/dashboard`;
      const result = transformVerificationUrl(url);

      expect(result.error).toBeUndefined();
      expect(result.originalCallbackURL).toBe("/dashboard");

      const parsedResult = new URL(result.url);
      expect(parsedResult.searchParams.get("callbackURL")).toBe("/dashboard");
      // Verify it's exactly /dashboard, not /dashboarddashboard
      expect(parsedResult.searchParams.get("callbackURL")).not.toContain(
        "dashboarddashboard"
      );
    });

    it("should handle URL-encoded /dashboard (%2Fdashboard)", () => {
      const url = `${BASE_URL}?token=${TOKEN}&callbackURL=%2Fdashboard`;
      const result = transformVerificationUrl(url);

      expect(result.error).toBeUndefined();
      expect(result.originalCallbackURL).toBe("/dashboard");

      const parsedResult = new URL(result.url);
      expect(parsedResult.searchParams.get("callbackURL")).toBe("/dashboard");
    });
  });

  describe("when callbackURL is a custom path", () => {
    it("should preserve custom callback paths", () => {
      const url = `${BASE_URL}?token=${TOKEN}&callbackURL=/custom/path`;
      const result = transformVerificationUrl(url);

      expect(result.error).toBeUndefined();
      expect(result.originalCallbackURL).toBe("/custom/path");

      const parsedResult = new URL(result.url);
      expect(parsedResult.searchParams.get("callbackURL")).toBe("/custom/path");
    });

    it("should preserve callbacks with query parameters", () => {
      const callbackWithParams = "/dashboard?tab=settings";
      const url = `${BASE_URL}?token=${TOKEN}&callbackURL=${encodeURIComponent(callbackWithParams)}`;
      const result = transformVerificationUrl(url);

      expect(result.error).toBeUndefined();
      expect(result.originalCallbackURL).toBe(callbackWithParams);

      const parsedResult = new URL(result.url);
      expect(parsedResult.searchParams.get("callbackURL")).toBe(
        callbackWithParams
      );
    });
  });

  describe("custom default callback", () => {
    it("should use custom default callback when provided", () => {
      const url = `${BASE_URL}?token=${TOKEN}&callbackURL=/`;
      const result = transformVerificationUrl(url, "/onboarding");

      expect(result.error).toBeUndefined();

      const parsedResult = new URL(result.url);
      expect(parsedResult.searchParams.get("callbackURL")).toBe("/onboarding");
    });
  });

  describe("error handling", () => {
    it("should handle invalid URLs gracefully", () => {
      const invalidUrl = "not-a-valid-url";
      const result = transformVerificationUrl(invalidUrl);

      expect(result.error).toBeDefined();
      expect(result.url).toBe(invalidUrl); // Returns original URL on error
      expect(result.originalCallbackURL).toBeNull();
    });

    it("should handle empty string", () => {
      const result = transformVerificationUrl("");

      expect(result.error).toBeDefined();
      expect(result.url).toBe("");
    });

    it("should handle URLs with special characters", () => {
      const url = `${BASE_URL}?token=${TOKEN}&callbackURL=${encodeURIComponent("/path with spaces")}`;
      const result = transformVerificationUrl(url);

      expect(result.error).toBeUndefined();
      expect(result.originalCallbackURL).toBe("/path with spaces");
    });
  });

  describe("real-world scenarios", () => {
    it("should handle URL similar to the bug report (initial signup)", () => {
      // When user signs up, better-auth uses default "/" callback
      const url =
        "https://reflet.app/api/auth/verify-email?token=eyJhbGciOiJIUzI1NiJ9.xxx&callbackURL=%2F";
      const result = transformVerificationUrl(url);

      expect(result.error).toBeUndefined();

      const parsedResult = new URL(result.url);
      expect(parsedResult.searchParams.get("callbackURL")).toBe("/dashboard");
    });

    it("should handle URL from resend verification (already has /dashboard)", () => {
      // When user resends from check-email page
      const url =
        "https://reflet.app/api/auth/verify-email?token=eyJhbGciOiJIUzI1NiJ9.xxx&callbackURL=%2Fdashboard";
      const result = transformVerificationUrl(url);

      expect(result.error).toBeUndefined();

      const parsedResult = new URL(result.url);
      expect(parsedResult.searchParams.get("callbackURL")).toBe("/dashboard");
      // CRITICAL: Should NOT be /dashboarddashboard
      expect(result.url).not.toContain("dashboarddashboard");
    });

    it("should handle URL without callbackURL (edge case)", () => {
      const url =
        "https://reflet.app/api/auth/verify-email?token=eyJhbGciOiJIUzI1NiJ9.xxx";
      const result = transformVerificationUrl(url);

      expect(result.error).toBeUndefined();

      const parsedResult = new URL(result.url);
      expect(parsedResult.searchParams.get("callbackURL")).toBe("/dashboard");
    });

    it("should preserve token when transforming URL", () => {
      const token =
        "eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3NjU4OTU0NjR9.xxx";
      const url = `https://reflet.app/api/auth/verify-email?token=${token}&callbackURL=%2F`;
      const result = transformVerificationUrl(url);

      const parsedResult = new URL(result.url);
      expect(parsedResult.searchParams.get("token")).toBe(token);
      expect(parsedResult.searchParams.get("callbackURL")).toBe("/dashboard");
    });
  });

  describe("edge cases that could cause dashboarddashboard", () => {
    it("should NOT append dashboard to existing /dashboard", () => {
      const inputs = [
        "/dashboard",
        "%2Fdashboard",
        "/Dashboard", // different case
        "/dashboard/",
        "/dashboard?foo=bar",
      ];

      for (const callbackURL of inputs) {
        const url = `${BASE_URL}?token=${TOKEN}&callbackURL=${encodeURIComponent(callbackURL)}`;
        const result = transformVerificationUrl(url);

        expect(result.url).not.toContain("dashboarddashboard");
        expect(result.url).not.toContain("Dashboard/dashboard");
      }
    });

    it("should handle multiple callbackURL parameters (takes first one)", () => {
      // Edge case: multiple callbackURL params in URL
      const url = `${BASE_URL}?token=${TOKEN}&callbackURL=/&callbackURL=/dashboard`;
      const result = transformVerificationUrl(url);

      expect(result.error).toBeUndefined();
      // URL.searchParams.get returns first value
      const parsedResult = new URL(result.url);
      expect(parsedResult.searchParams.get("callbackURL")).toBe("/dashboard");
    });
  });
});
