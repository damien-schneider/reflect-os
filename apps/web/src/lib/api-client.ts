/**
 * Type-safe API Client
 *
 * This module provides a typed API client using Hono's RPC client.
 * Due to TypeScript module resolution complexity in monorepos, we use
 * explicit type definitions for the API endpoints.
 *
 * @example
 * ```ts
 * import { api } from "@/lib/api-client";
 *
 * // Typed response
 * const res = await api.api["zero-token"].$get();
 * const { token } = await res.json();
 * ```
 */

import { hc } from "hono/client";

// =============================================================================
// API Type Definitions
// =============================================================================
// These types define the shape of our API endpoints.
// They're manually defined to avoid cross-package type resolution issues.

/** Response types for API endpoints */
interface ZeroTokenSuccessResponse {
  token: string;
}
interface ZeroTokenErrorResponse {
  error: string;
  details?: string;
}
type ZeroTokenResponse = ZeroTokenSuccessResponse | ZeroTokenErrorResponse;

interface EnsureCustomerSuccessResponse {
  success: true;
  customerId: string;
  created: boolean;
}
interface EnsureCustomerErrorResponse {
  error: string;
  details?: string;
}
type EnsureCustomerResponse =
  | EnsureCustomerSuccessResponse
  | EnsureCustomerErrorResponse;

interface SyncSubscriptionSuccessResponse {
  synced: true;
  subscription: {
    id: string | null;
    tier: string;
    status: string;
    productName: string | null;
  };
  downgraded?: boolean;
  message?: string;
}
interface SyncSubscriptionNoSubResponse {
  synced: false;
  message: string;
}
interface SyncSubscriptionErrorResponse {
  error: string;
  details?: string;
}
type SyncSubscriptionResponse =
  | SyncSubscriptionSuccessResponse
  | SyncSubscriptionNoSubResponse
  | SyncSubscriptionErrorResponse;

interface CheckSubscriptionResponse {
  hasActiveSubscription: boolean;
  canCheckout: boolean;
  currentTier?: string;
  productName?: string | null;
  message?: string;
  error?: string;
}

interface ProductsResponse {
  products: Array<{
    id: string;
    name: string;
    description: string | null;
    slug: string;
    isRecurring: boolean;
    recurringInterval: string | null;
    prices: Array<{
      id: string;
      amount: number | null;
      currency: string;
      type: string;
    }>;
    benefits: Array<{
      id: string;
      type: string;
      description: string | null;
    }>;
  }>;
  error?: string;
}

/**
 * Typed API Response - wraps the Response with proper json() typing
 */
type TypedResponse<T> = Omit<Response, "json"> & {
  json(): Promise<T>;
};

/** API client type - manually typed for cross-package compatibility */
interface ApiClientType {
  api: {
    "zero-token": {
      $get: () => Promise<TypedResponse<ZeroTokenResponse>>;
    };
    "ensure-customer": {
      $post: () => Promise<TypedResponse<EnsureCustomerResponse>>;
    };
    "sync-subscription": {
      $post: (options: {
        json: { organizationId: string };
      }) => Promise<TypedResponse<SyncSubscriptionResponse>>;
    };
    "check-subscription": {
      $post: (options: {
        json: { organizationId: string; targetTier?: string | null };
      }) => Promise<TypedResponse<CheckSubscriptionResponse>>;
    };
    products: {
      $get: () => Promise<TypedResponse<ProductsResponse>>;
    };
  };
}

// =============================================================================
// API Client Implementation
// =============================================================================

// API base URL is always same-origin (empty string)
// In development: Vite proxies /api/* to backend (see vite.config.ts)
// In production: web server proxies /api/* to backend (see server.ts)
const API_BASE_URL = "";

/**
 * Type-safe API client instance
 *
 * All endpoints are typed based on the backend's route definitions.
 * The client includes credentials for authenticated requests.
 */
export const api: ApiClientType = hc(API_BASE_URL, {
  fetch: (input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, {
      ...init,
      credentials: "include",
    }),
}) as unknown as ApiClientType;

// Export response types for consumers
export type {
  ZeroTokenResponse,
  EnsureCustomerResponse,
  SyncSubscriptionResponse,
  CheckSubscriptionResponse,
  ProductsResponse,
};

/**
 * Helper to get response data with error handling
 */
export async function fetchApi<T>(
  request: Promise<Response>
): Promise<{ data: T } | { error: string }> {
  try {
    const res = await request;
    if (!res.ok) {
      const errorData = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      return { error: errorData.error ?? `Request failed: ${res.status}` };
    }
    const data = (await res.json()) as T;
    return { data };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
