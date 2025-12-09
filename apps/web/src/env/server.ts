import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Server-side environment variables
 *
 * These are validated at RUNTIME (not build time) because:
 * 1. They contain secrets that shouldn't be in the build
 * 2. They're provided via Docker environment at container start
 * 3. They may differ between environments (staging vs production)
 *
 * For build-time validation, see client.ts
 */
export const serverEnv = createEnv({
  server: {
    /**
     * Port for the web server to listen on
     */
    PORT: z.coerce.number().default(3000),

    /**
     * Internal API URL for proxying requests to backend
     * In Docker: http://backend:3001, locally: http://localhost:3001
     */
    VITE_PUBLIC_API_URL: z.string().url().default("http://localhost:3001"),

    /**
     * Node environment
     */
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),

    /**
     * PostgreSQL connection string for Zero upstream database
     * @example "postgresql://user:password@localhost:5432/mydb"
     */
    ZERO_UPSTREAM_DB: z
      .string()
      .url("ZERO_UPSTREAM_DB must be a valid PostgreSQL URL")
      .refine(
        (url) =>
          url.startsWith("postgresql://") || url.startsWith("postgres://"),
        "ZERO_UPSTREAM_DB must be a PostgreSQL connection string"
      )
      .optional(),

    /**
     * Secret key for Zero JWT authentication (min 32 chars for security)
     */
    ZERO_AUTH_SECRET: z
      .string()
      .min(1, "ZERO_AUTH_SECRET is required")
      .optional(),

    /**
     * Path to Zero replica SQLite file (for local development)
     * @example "/tmp/zero_replica.db"
     */
    ZERO_REPLICA_FILE: z.string().optional(),

    /**
     * Zero cache server log level
     */
    ZERO_LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

    /**
     * Secret key for Better Auth sessions (min 32 chars for security)
     */
    BETTER_AUTH_SECRET: z
      .string()
      .min(1, "BETTER_AUTH_SECRET is required")
      .optional(),

    /**
     * Base URL for Better Auth callbacks
     * @example "http://localhost:5173" for development
     * @example "https://yourdomain.com" for production
     */
    BETTER_AUTH_URL: z
      .string()
      .url("BETTER_AUTH_URL must be a valid URL")
      .optional(),

    /**
     * AWS Region (optional, for SST/AWS deployment)
     */
    AWS_REGION: z.string().optional(),

    /**
     * Custom domain name (optional, for SST deployment)
     */
    DOMAIN_NAME: z.string().optional(),

    /**
     * ACM certificate ARN for custom domain (optional, for SST deployment)
     */
    DOMAIN_CERT: z.string().optional(),

    // ============================================
    // POLAR BILLING (optional)
    // ============================================

    /**
     * Polar organization access token for API calls
     */
    POLAR_ACCESS_TOKEN: z.string().min(1).optional(),

    /**
     * Polar webhook secret for verifying webhook signatures
     */
    POLAR_WEBHOOK_SECRET: z.string().min(1).optional(),

    /**
     * Polar environment (sandbox for testing, production for live)
     */
    POLAR_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
  },
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
