/**
 * Mock data fixtures for backend testing
 * Use these to create consistent test data for API tests
 */

export const mockUser = {
  id: "test-user-1",
  email: "test@example.com",
  name: "Test User",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

export const mockAuthSession = {
  id: "session-1",
  userId: mockUser.id,
  token: "test-token-123",
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
};

export const mockProduct = {
  id: "product-1",
  name: "Test Product",
  description: "A test product",
  price: 9999, // in cents
  createdAt: new Date("2025-01-01"),
};
