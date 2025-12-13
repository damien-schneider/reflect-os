import { afterAll, afterEach, beforeAll, vi } from "vitest";

/**
 * Global test setup for backend tests
 * Configure database connections, mocks, and test fixtures here
 */

// Example: Setup test database transactions for isolation
beforeAll(() => {
  // Setup code - initialize test database if needed
});

afterEach(() => {
  // Cleanup after each test
  vi.clearAllMocks();
});

afterAll(() => {
  // Cleanup after all tests
});
