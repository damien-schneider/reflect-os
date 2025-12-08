/**
 * Backend Package Exports
 *
 * Main entry point for the @repo/backend package.
 * Exports the Hono app and types for consumption by other packages.
 */

// Export auth utilities that may be needed elsewhere
export { auth } from "./auth";
// Export the typed app for use in other packages
export { type AppType, app } from "./routes/index";
