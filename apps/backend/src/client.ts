/**
 * Type-safe API Client
 *
 * This file provides a pre-configured hono/client for use in frontend apps.
 * Import this in your frontend to get fully typed API calls.
 *
 * @example
 * ```ts
 * import { createApiClient } from "@repo/backend/client";
 *
 * const api = createApiClient("http://localhost:3001");
 * const res = await api.products.$get();
 * const { products } = await res.json(); // Fully typed!
 * ```
 */

import { hc } from "hono/client";
import type { AppType } from "./routes";

/**
 * Create a type-safe API client
 * @param baseUrl - The base URL of the API server (e.g., "http://localhost:3001" or "" for same-origin)
 */
export function createApiClient(baseUrl: string) {
  return hc<AppType>(baseUrl);
}

// Re-export the AppType for manual client creation
export type { AppType } from "./routes";
