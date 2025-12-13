import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuthSession, mockUser } from "./fixtures/mock-data";

/**
 * Example API test
 * Tests backend routes and business logic
 * Run with: npm run test
 */

describe("Example API Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a user", () => {
    // Example test
    expect(mockUser.email).toBe("test@example.com");
  });

  it("should authenticate a user", () => {
    // Example authentication test
    expect(mockAuthSession.userId).toBe(mockUser.id);
  });
});
