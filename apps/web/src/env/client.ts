import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// Helper to normalize URLs - adds https:// if no protocol is present
const normalizeUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  // Skip placeholder values (will be replaced at runtime)
  if (url.startsWith('__') && url.endsWith('__')) {
    return url;
  }
  // If it already has a protocol, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Add https:// prefix for production domains
  return `https://${url}`;
};

// Check if we're in build mode with placeholders
const isPlaceholder = (val: string) => val.startsWith('__') && val.endsWith('__');

// Pre-process environment variables to ensure they have protocols
const processedEnv = {
  ...import.meta.env,
  VITE_PUBLIC_ZERO_SERVER: normalizeUrl(import.meta.env.VITE_PUBLIC_ZERO_SERVER as string | undefined),
  VITE_PUBLIC_API_SERVER: normalizeUrl(import.meta.env.VITE_PUBLIC_API_SERVER as string | undefined),
};

export const clientEnv = createEnv({
  clientPrefix: "VITE_PUBLIC_",
  client: {
    /**
     * URL of the Zero sync server (WebSocket endpoint)
     * @example "http://localhost:4848" for development
     * @example "https://zero.yourdomain.com" for production
     */
    VITE_PUBLIC_ZERO_SERVER: z
      .string()
      .refine(
        (val) => isPlaceholder(val) || z.string().url().safeParse(val).success,
        "VITE_PUBLIC_ZERO_SERVER must be a valid URL"
      ),
    /**
     * URL of the API server (Hono backend)
     * @example "http://localhost:5173" for development
     * @example "https://api.yourdomain.com" for production
     */
    VITE_PUBLIC_API_SERVER: z
      .string()
      .refine(
        (val) => isPlaceholder(val) || z.string().url().safeParse(val).success,
        "VITE_PUBLIC_API_SERVER must be a valid URL"
      ),
  },
  runtimeEnv: processedEnv,
  emptyStringAsUndefined: true,
  // Tell t3-env when we're in a server context
  isServer: typeof window === "undefined",
});
