import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

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
      .url("VITE_PUBLIC_ZERO_SERVER must be a valid URL"),
    /**
     * URL of the API server (Hono backend)
     * @example "http://localhost:5173" for development
     * @example "https://api.yourdomain.com" for production
     */
    VITE_PUBLIC_API_SERVER: z
      .string()
      .url("VITE_PUBLIC_API_SERVER must be a valid URL"),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
  // Tell t3-env when we're in a server context
  isServer: typeof window === "undefined",
});
