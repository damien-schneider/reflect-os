/**
 * Server-side environment variables
 *
 * These are validated at RUNTIME (not build time) because:
 * 1. They contain secrets that shouldn't be in the build
 * 2. They're provided via Docker environment at container start
 * 3. They may differ between environments (staging vs production)
 */
import { createEnv } from "@t3-oss/env-core";
import { serverSchema } from "./schema";

export const serverEnv = createEnv({
  server: serverSchema,
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  // Server env vars are validated at RUNTIME, not build time
  // Skip validation during:
  // - Vite build (server vars not available)
  // - Client-side (no access to server vars)
  // - Lint/test commands
  skipValidation:
    !!process.env.SKIP_ENV_VALIDATION ||
    process.env.npm_lifecycle_event === "build" ||
    process.env.npm_lifecycle_event === "lint" ||
    typeof window !== "undefined",
  onValidationError: (issues) => {
    console.error("❌ Invalid server environment variables:");
    for (const issue of issues) {
      console.error(`  - ${issue.path?.join(".")}: ${issue.message}`);
    }
    throw new Error("Invalid server environment variables");
  },
  onInvalidAccess: (variable) => {
    throw new Error(
      `❌ Attempted to access server-side env var "${variable}" on the client`
    );
  },
});
