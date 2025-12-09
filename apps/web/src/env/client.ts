import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// Check if we're in build mode with placeholders (for Docker runtime injection)
const isPlaceholder = (val: string) =>
  val.startsWith("__") && val.endsWith("__");

// Custom URL schema that allows placeholders during Docker build
const urlOrPlaceholder = z
  .string()
  .refine(
    (val) => isPlaceholder(val) || z.string().url().safeParse(val).success,
    { message: "Must be a valid URL or a placeholder for runtime injection" }
  );

export const clientEnv = createEnv({
  clientPrefix: "VITE_PUBLIC_",
  client: {
    /**
     * URL of the Zero sync server (WebSocket endpoint)
     * @example "http://localhost:4848" for development
     * @example "https://zero.yourdomain.com" for production
     * @note Can use __VITE_PUBLIC_ZERO_SERVER__ placeholder for Docker runtime injection
     */
    VITE_PUBLIC_ZERO_SERVER: urlOrPlaceholder,

    /**
     * URL of the backend API server (optional)
     * If not set, API calls go to same origin (Vite proxy in dev, or /api/* in prod)
     * @example "http://localhost:3001" for development with separate backend
     * @example "https://api.yourdomain.com" for production
     */
    VITE_PUBLIC_API_URL: urlOrPlaceholder.optional(),
  },
  runtimeEnv: {
    VITE_PUBLIC_ZERO_SERVER: import.meta.env.VITE_PUBLIC_ZERO_SERVER,
    VITE_PUBLIC_API_URL: import.meta.env.VITE_PUBLIC_API_URL,
  },
  emptyStringAsUndefined: true,
  isServer: typeof window === "undefined",
  // Validate at build time - this ensures VITE_PUBLIC_* vars are set
  // Placeholders (__VAR__) are allowed for Docker runtime injection
  skipValidation: false,
  onValidationError: (issues) => {
    console.error("❌ Invalid client environment variables:");
    for (const issue of issues) {
      console.error(`  - ${issue.path?.join(".")}: ${issue.message}`);
    }
    throw new Error("Invalid client environment variables");
  },
});
