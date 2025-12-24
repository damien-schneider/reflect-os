import { describe, expect, it } from "bun:test";

// Dynamic import to allow module resolution
const { parseInviteParams, buildInviteLoginUrl, isValidInviteId } =
  await import("@/lib/invitation-utils");

describe("Invitation Utils", () => {
  describe("parseInviteParams", () => {
    it("should parse invitation id from URL search params", () => {
      const params = new URLSearchParams("inviteId=abc123");
      const result = parseInviteParams(params);

      expect(result).toEqual({
        inviteId: "abc123",
        orgName: undefined,
      });
    });

    it("should parse both invitation id and org name", () => {
      const params = new URLSearchParams("inviteId=abc123&orgName=My%20Org");
      const result = parseInviteParams(params);

      expect(result).toEqual({
        inviteId: "abc123",
        orgName: "My Org",
      });
    });

    it("should return null for inviteId if not present", () => {
      const params = new URLSearchParams("other=value");
      const result = parseInviteParams(params);

      expect(result).toEqual({
        inviteId: null,
        orgName: undefined,
      });
    });

    it("should handle empty search params", () => {
      const params = new URLSearchParams("");
      const result = parseInviteParams(params);

      expect(result).toEqual({
        inviteId: null,
        orgName: undefined,
      });
    });
  });

  describe("buildInviteLoginUrl", () => {
    it("should build login URL with invite params", () => {
      const result = buildInviteLoginUrl("abc123", "My Org");

      // URLSearchParams uses + for spaces, which is valid
      expect(result).toBe("/login?inviteId=abc123&orgName=My+Org");
    });

    it("should build login URL without org name", () => {
      const result = buildInviteLoginUrl("abc123");

      expect(result).toBe("/login?inviteId=abc123");
    });

    it("should encode special characters in org name", () => {
      const result = buildInviteLoginUrl("abc123", "Test & Co.");

      // URLSearchParams encodes & as %26, spaces as +
      expect(result).toBe("/login?inviteId=abc123&orgName=Test+%26+Co.");
    });
  });

  describe("isValidInviteId", () => {
    it("should return true for valid UUID-like invite id", () => {
      expect(isValidInviteId("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe(
        true
      );
    });

    it("should return true for short alphanumeric invite id", () => {
      expect(isValidInviteId("abc123")).toBe(true);
    });

    it("should return false for empty string", () => {
      expect(isValidInviteId("")).toBe(false);
    });

    it("should return false for null/undefined", () => {
      expect(isValidInviteId(null as unknown as string)).toBe(false);
      expect(isValidInviteId(undefined as unknown as string)).toBe(false);
    });

    it("should return false for strings with special characters", () => {
      expect(isValidInviteId("abc<script>")).toBe(false);
      expect(isValidInviteId("abc/../etc")).toBe(false);
    });

    it("should return false for extremely long strings", () => {
      const longId = "a".repeat(100);
      expect(isValidInviteId(longId)).toBe(false);
    });
  });
});

describe("Invitation Flow State", () => {
  describe("invitation redirect handling", () => {
    it("should preserve invite params through auth flow", () => {
      // This tests the concept - actual implementation will use URL params
      const inviteParams = {
        inviteId: "invite-123",
        orgName: "Test Org",
      };

      // Simulate storing in session/URL
      const loginUrl = buildInviteLoginUrl(
        inviteParams.inviteId,
        inviteParams.orgName
      );
      const parsedUrl = new URL(loginUrl, "http://localhost");
      const recoveredParams = parseInviteParams(parsedUrl.searchParams);

      expect(recoveredParams.inviteId).toBe(inviteParams.inviteId);
      expect(recoveredParams.orgName).toBe(inviteParams.orgName);
    });
  });
});
