import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const serverEnv = createEnv({
  server: {
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
      ),

    /**
     * Secret key for Zero JWT authentication (min 32 chars for security)
     */
    ZERO_AUTH_SECRET: z
      .string()
      .min(1, "ZERO_AUTH_SECRET is required")
      .refine(
        (val) => process.env.NODE_ENV === "development" || val.length >= 32,
        "ZERO_AUTH_SECRET must be at least 32 characters in production"
      ),

    /**
     * Path to Zero replica SQLite file (for local development)
     * @example "/tmp/zero_replica.db"
     */
    ZERO_REPLICA_FILE: z.string().optional(),

    /**
     * Zero cache server log level
     */
    ZERO_LOG_LEVEL: z
      .enum(["debug", "info", "warn", "error"])
      .optional()
      .default("info"),

    /**
     * Secret key for Better Auth sessions (min 32 chars for security)
     */
    BETTER_AUTH_SECRET: z
      .string()
      .min(1, "BETTER_AUTH_SECRET is required")
      .refine(
        (val) => process.env.NODE_ENV === "development" || val.length >= 32,
        "BETTER_AUTH_SECRET must be at least 32 characters in production"
      ),

    /**
     * Base URL for Better Auth callbacks
     * @example "http://localhost:5173" for development
     * @example "https://yourdomain.com" for production
     */
    BETTER_AUTH_URL: z
      .string()
      .transform((url) => {
        // Add https:// if no protocol is present
        if (!(url.startsWith("http://") || url.startsWith("https://"))) {
          return `https://${url}`;
        }
        return url;
      })
      .pipe(z.string().url("BETTER_AUTH_URL must be a valid URL")),

    /**
     * AWS Region (optional, for SST/AWS deployment)
     */
    AWS_REGION: z.string().optional(),

    /**
     * Custom domain name (optional, for SST deployment)
     * @example "yourdomain.com"
     */
    DOMAIN_NAME: z.string().optional(),

    /**
     * ACM certificate ARN for custom domain (optional, for SST deployment)
     */
    DOMAIN_CERT: z.string().optional(),

    /**
     * Node environment
     */
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .optional()
      .default("development"),

    // ============================================
    // POLAR BILLING
    // ============================================

    /**
     * Polar organization access token for API calls
     * Get this from your Polar organization settings
     */
    POLAR_ACCESS_TOKEN: z.string().min(1).optional(),

    /**
     * Polar webhook secret for verifying webhook signatures
     * Get this when creating a webhook endpoint in Polar dashboard
     */
    POLAR_WEBHOOK_SECRET: z.string().min(1).optional(),

    /**
     * Polar environment (sandbox for testing, production for live)
     * Use sandbox during development to test without real payments
     */
    POLAR_ENVIRONMENT: z
      .enum(["sandbox", "production"])
      .optional()
      .default("sandbox"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  // Skip validation during build (when server env vars aren't available)
  // and in lint/client environments
  skipValidation:
    !!process.env.SKIP_ENV_VALIDATION ||
    process.env.npm_lifecycle_event === "lint" ||
    process.env.npm_lifecycle_event === "build" ||
    typeof window !== "undefined",
});
