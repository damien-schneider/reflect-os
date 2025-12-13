/**
 * Mock data fixtures for testing
 * Use these to create consistent test data across tests
 */

export const mockUser = {
  id: "test-user-1",
  email: "test@example.com",
  name: "Test User",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

export const mockOrganization = {
  id: "test-org-1",
  name: "Test Organization",
  slug: "test-org",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

export const mockBoard = {
  id: "test-board-1",
  name: "Test Board",
  organizationId: mockOrganization.id,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};
