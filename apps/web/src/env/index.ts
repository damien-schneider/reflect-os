/**
 * Unified environment variable exports
 *
 * This file re-exports both client and server environment configurations.
 * Use this for importing environment variables in your application.
 *
 * Usage:
 *   - Server-side code: import { serverEnv } from "@/env"
 *   - Client-side code: import { clientEnv } from "@/env"
 *
 * The t3-env library ensures:
 *   - Type-safe access to environment variables
 *   - Runtime validation using Zod schemas
 *   - Prevention of server variable leakage to client
 *   - Clear error messages for missing/invalid variables
 */

export { clientEnv } from "@/env/client";
export { serverEnv } from "@/env/server";
