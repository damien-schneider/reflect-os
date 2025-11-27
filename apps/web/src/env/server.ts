import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const serverEnv = createEnv({
  server: {
    // Database
    ZERO_UPSTREAM_DB: z.url(),

    // Zero Auth
    ZERO_AUTH_SECRET: z.string().min(1),

    // Zero Replica (local development)
    ZERO_REPLICA_FILE: z.string().optional(),

    // Zero Log Level
    ZERO_LOG_LEVEL: z
      .enum(["debug", "info", "warn", "error"])
      .optional()
      .default("info"),

    // Better Auth
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.string().url(),

    // AWS (optional, for SST deployment)
    AWS_REGION: z.string().optional(),

    // Custom domain (optional, for SST deployment)
    DOMAIN_NAME: z.string().optional(),
    DOMAIN_CERT: z.string().optional(),

    // Node environment
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .optional()
      .default("development"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
