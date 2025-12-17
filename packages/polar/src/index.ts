/**
 * @repo/polar
 *
 * Polar subscription integration package.
 *
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         FILE ORGANIZATION                                  ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  📝 EDIT THIS FILE:                                                        ║
 * ║     src/tiers.ts - Subscription plans, limits, and pricing                 ║
 * ║                                                                            ║
 * ║  🔧 IMPLEMENTATION FILES (do not edit unless extending):                   ║
 * ║     src/lib/config.ts      - Environment configuration                     ║
 * ║     src/lib/client.ts      - Polar SDK client                              ║
 * ║     src/lib/plugin.ts      - Better Auth plugin                            ║
 * ║     src/lib/subscription.ts - Subscription helpers                         ║
 * ║     src/lib/validate.ts    - Build-time validation                         ║
 * ║     src/lib/webhooks.ts    - Webhook handlers                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * Usage:
 * ```typescript
 * import {
 *   createPolarConfigFromEnv,
 *   initializePolarClient,
 *   createPolarPlugins,
 *   isPolarEnabled,
 *   assertPolarProducts,
 * } from "@repo/polar";
 *
 * // Initialize from environment
 * const config = createPolarConfigFromEnv(process.env);
 * const client = initializePolarClient(config);
 *
 * // Validate products at build time
 * await assertPolarProducts(config);
 *
 * // Use in Better Auth
 * const polarPlugins = createPolarPlugins(
 *   client ? { client, config, pool: dbPool } : null
 * );
 * ```
 */

// =============================================================================
// CONFIGURATION (from tiers.ts - the file you should edit for plans)
// =============================================================================
export type { BillingInterval, SubscriptionTier } from "./tiers";
export {
  getTierDisplay,
  getTierLimits,
  isPaidTier,
  mapProductToTier,
  PAID_TIERS,
  PLAN_LIMITS,
  PLAN_TIERS,
} from "./tiers";

// =============================================================================
// IMPLEMENTATION EXPORTS (from lib/ - normally don't need to edit)
// =============================================================================

// Client
export {
  createPolarClient,
  getPolarClient,
  initializePolarClient,
  isPolarEnabled,
} from "./lib/client";

// Config
export type { PolarConfig } from "./lib/config";
export {
  assertPolarConfig,
  createPolarConfigFromEnv,
  defaultPolarConfig,
  validatePolarConfig,
} from "./lib/config";

// Better Auth plugin
export { createPolarPlugins } from "./lib/plugin";

// Subscription helpers
export type {
  OrgSubscriptionUpdate,
  SubscriptionData,
} from "./lib/subscription";
export {
  processSubscriptionEvent,
  updateOrgSubscription,
  upsertSubscription,
} from "./lib/subscription";

// Build-time validation
export { assertPolarProducts, validatePolarProducts } from "./lib/validate";

// Webhooks (for advanced usage)
export { createPolarWebhooks } from "./lib/webhooks";
