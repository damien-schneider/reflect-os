/**
 * Subscription Feature Exports
 *
 * File structure:
 * - tiers.config.ts  → EDIT THIS for tier changes (types, limits, display)
 * - status.config.ts → Status display configuration (rarely changes)
 * - tier.utils.ts    → Helper functions for tier parsing/validation
 * - hooks/           → React hooks for subscription state
 * - components/      → UI components
 * - store/           → Jotai atoms
 */

// =============================================================================
// COMPONENTS
// =============================================================================
export { ManageSubscriptionButton } from "./components/manage-subscription-button";
export { PlanBadge, StatusBadge } from "./components/plan-badge";
export { UpgradeButton } from "./components/upgrade-button";

// =============================================================================
// HOOKS
// =============================================================================
export {
  calculateYearlySavings,
  getProductCurrency,
  getProductPrice,
  type PolarBenefit,
  type PolarPrice,
  type PolarProduct,
  type ProductsByTier,
  useProducts,
} from "./hooks/use-products";

export {
  useCanManageSubscription,
  useCustomerPortal,
  useFeatureAccess,
  useLimitCheck,
  useSubscription,
  useSubscriptionCheckout,
  useSubscriptionSync,
} from "./hooks/use-subscription";
export { STATUS_CONFIG, type SubscriptionStatus } from "./status.config";
// =============================================================================
// STORE (Jotai atoms)
// =============================================================================
export {
  currentPlanLimitsAtom,
  hasApiAccessAtom,
  hasCustomBrandingAtom,
  isFreePlanAtom,
  isPaidPlanAtom,
  isSubscriptionActiveAtom,
  maxBoardsAtom,
  maxMembersAtom,
  subscriptionIdAtom,
  subscriptionStatusAtom,
  subscriptionTierAtom,
} from "./store/atoms";
// =============================================================================
// UTILITIES
// =============================================================================
export {
  getSortedPaidTiers,
  getTierWithFallback,
  isValidTier,
  parseTierFromProductName,
  parseTierFromProductSlug,
} from "./tier.utils";
// =============================================================================
// CONFIGURATION (edit tiers.config.ts when adding/changing tiers)
// =============================================================================
export {
  type BillingInterval,
  PAID_TIERS,
  PLAN_LIMITS,
  PLAN_TIERS,
  type SubscriptionTier,
} from "./tiers.config";
