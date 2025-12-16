import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    /**
     * PostgreSQL connection string for Zero upstream database
     * @example "postgresql://user:password@localhost:5432/mydb"
     */
    ZERO_UPSTREAM_DB: z
      .url("ZERO_UPSTREAM_DB must be a valid PostgreSQL URL")
      .refine(
        (url) =>
          url.startsWith("postgresql://") || url.startsWith("postgres://"),
        "ZERO_UPSTREAM_DB must be a PostgreSQL connection string"
      )
      .refine((url) => {
        if (process.env.NODE_ENV !== "production") {
          return true;
        }
        // Reject default/template credentials in production
        const insecurePatterns = [
          "user:password@",
          "postgres:password@",
          "@localhost",
          "@127.0.0.1",
        ];
        return !insecurePatterns.some((pattern) => url.includes(pattern));
      }, "ZERO_UPSTREAM_DB contains default/insecure credentials. " +
        "Use strong credentials and a production database host in production."),

    /**
     * Secret key for Zero JWT authentication (min 32 chars for security)
     */
    ZERO_AUTH_SECRET: z
      .string()
      .min(1, "ZERO_AUTH_SECRET is required")
      .refine(
        (val) => process.env.NODE_ENV !== "production" || val.length >= 32,
        "ZERO_AUTH_SECRET must be at least 32 characters in production"
      )
      .refine((val) => {
        if (process.env.NODE_ENV !== "production") {
          return true;
        }
        // Reject template/default values in production
        const insecurePatterns = [
          "your-zero-auth-secret",
          "testsecretkey",
          "test-secret",
          "secret",
        ];
        return !insecurePatterns.some((pattern) =>
          val.toLowerCase().includes(pattern)
        );
      }, "ZERO_AUTH_SECRET contains a default/template value. " +
        "Generate a strong random secret for production (min 32 chars)."),

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
        (val) => process.env.NODE_ENV !== "production" || val.length >= 32,
        "BETTER_AUTH_SECRET must be at least 32 characters in production"
      )
      .refine((val) => {
        if (process.env.NODE_ENV !== "production") {
          return true;
        }
        // Reject template/default values in production
        const insecurePatterns = [
          "your-better-auth-secret",
          "testbetterauthsecret",
          "test-secret",
          "secret",
        ];
        return !insecurePatterns.some((pattern) =>
          val.toLowerCase().includes(pattern)
        );
      }, "BETTER_AUTH_SECRET contains a default/template value. " +
        "Generate a strong random secret for production (min 32 chars)."),

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
      .pipe(z.url("BETTER_AUTH_URL must be a valid URL")),

    /**
     * Node environment
     */
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .optional()
      .default("development"),

    /**
     * Port for the backend server
     */
    PORT: z.coerce.number().optional().default(3001),

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

    // ============================================
    // EMAIL (RESEND) - Optional
    // If not configured, email features are disabled:
    // - Email verification is skipped
    // - Password reset emails won't be sent
    // - Organization invites won't be sent
    // ============================================

    /**
     * Resend API key for sending emails
     * Get this from your Resend dashboard at https://resend.com
     * Optional: If not set, email features are disabled
     */
    RESEND_API_KEY: z.string().min(1).optional(),

    /**
     * Email sender address
     * Use onboarding@resend.dev for development (Resend's test domain)
     * Use your verified domain email for production
     * @example "noreply@yourdomain.com"
     */
    EMAIL_FROM_ADDRESS: z
      .string()
      .email("EMAIL_FROM_ADDRESS must be a valid email")
      .optional()
      .default("onboarding@resend.dev"),

    /**
     * Email sender name displayed to recipients
     * @example "Reflet"
     */
    EMAIL_FROM_NAME: z.string().optional().default("Reflet"),

    /**
     * Development-only flag to bypass email verification for local testing
     * WARNING: Never enable in production
     */
    DEV_AUTH_ALLOW_UNVERIFIED_SIGNUP: z
      .enum(["true", "false"])
      .default("false"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  // Skip validation during build
  skipValidation:
    !!process.env.SKIP_ENV_VALIDATION ||
    process.env.npm_lifecycle_event === "lint",
});
