/**
 * Shared environment variable schemas
 *
 * This file contains the Zod schemas used by client.ts, server.ts, and build.ts.
 * Keeping schemas separate avoids duplication and ensures consistency.
 */
import { z } from "zod";

// ============================================
// HELPERS
// ============================================

/**
 * Check if value is a placeholder for Docker runtime injection
 * Placeholders look like __VARIABLE_NAME__
 */
export const isPlaceholder = (val: string) =>
  val.startsWith("__") && val.endsWith("__");

/**
 * URL schema that allows placeholders for Docker runtime injection
 */
export const urlOrPlaceholder = z
  .string()
  .refine(
    (val) => isPlaceholder(val) || z.string().url().safeParse(val).success,
    { message: "Must be a valid URL or a placeholder for runtime injection" }
  );

// ============================================
// CLIENT SCHEMAS (VITE_PUBLIC_*)
// ============================================

export const clientSchema = {
  /**
   * URL of the Zero sync server (WebSocket endpoint)
   * @example "http://localhost:4848" for development
   * @example "https://zero.yourdomain.com" for production
   * @note Can use __VITE_PUBLIC_ZERO_SERVER__ placeholder for Docker runtime injection
   */
  VITE_PUBLIC_ZERO_SERVER: urlOrPlaceholder,
} as const;

// ============================================
// SERVER SCHEMAS
// ============================================

export const serverSchema = {
  /**
   * Port for the web server to listen on
   */
  PORT: z.coerce.number().default(3000),

  /**
   * Internal backend API URL for server-side proxy
   * Uses Docker service name internally, NOT for browser access
   * @example "http://localhost:3001" for development
   * @example "http://backend:3001" for Docker
   */
  INTERNAL_API_URL: z.string().url().default("http://localhost:3001"),

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
      (url) => url.startsWith("postgresql://") || url.startsWith("postgres://"),
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
} as const;
