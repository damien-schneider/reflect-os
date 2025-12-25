/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                     SUBSCRIPTION TIERS CONFIGURATION                       ║
 * ║                                                                            ║
 * ║  This is the MAIN FILE to edit when adding or changing subscription tiers ║
 * ║                                                                            ║
 * ║  NOTE: Team tier is currently DISABLED (search for "TODO: Re-enable")      ║
 * ║                                                                            ║
 * ║  When adding a new tier:                                                   ║
 * ║  1. Add the tier key to SubscriptionTier type                              ║
 * ║  2. Add it to PAID_TIERS array (if it's a paid tier)                       ║
 * ║  3. Add configuration to PLAN_TIERS (display info)                         ║
 * ║  4. Add limits to PLAN_LIMITS                                              ║
 * ║  5. Create products in Polar named: "{TierLabel} Monthly/Yearly"           ║
 * ║     e.g., "Pro Monthly", "Pro Yearly"                                      ║
 * ║                                                                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

// =============================================================================
// TIER TYPES
// =============================================================================

/**
 * All available subscription tiers.
 * Add new tier keys here when creating new plans.
 */
// TODO: Re-enable team tier when ready
// export type SubscriptionTier = "free" | "pro" | "team";
export type SubscriptionTier = "free" | "pro";

/**
 * Billing interval options
 */
export type BillingInterval = "month" | "year";

// =============================================================================
// PAID TIERS (require Polar products)
// =============================================================================

/**
 * Paid tiers that require Polar products.
 * Order matters: lowest to highest tier.
 *
 * For each tier listed here, you MUST create 2 products in Polar:
 * - "{TierLabel} Monthly" (e.g., "Pro Monthly")
 * - "{TierLabel} Yearly" (e.g., "Pro Yearly")
 */
// TODO: Re-enable team tier when ready
// export const PAID_TIERS: Exclude<SubscriptionTier, "free">[] = ["pro", "team"];
export const PAID_TIERS: Exclude<SubscriptionTier, "free">[] = ["pro"];

// =============================================================================
// TIER DISPLAY CONFIGURATION
// =============================================================================

interface TierDisplayConfig {
  /** Display name shown in UI */
  label: string;
  /** Short description of the tier */
  description: string;
  /** Tailwind text color class */
  color: string;
  /** Badge variant for plan badges */
  badgeVariant: "default" | "secondary" | "outline";
  /** Sort order (0 = lowest/free, higher = premium) */
  order: number;
}

/**
 * Display configuration for each tier.
 * Used for labels, badges, and UI styling.
 */
export const PLAN_TIERS: Record<SubscriptionTier, TierDisplayConfig> = {
  free: {
    label: "Free",
    description: "Basic features for small projects",
    color: "text-gray-600 dark:text-gray-400",
    badgeVariant: "outline",
    order: 0,
  },
  pro: {
    label: "Pro",
    description: "Advanced features for growing teams",
    color: "text-blue-600 dark:text-blue-400",
    badgeVariant: "default",
    order: 1,
  },
  // TODO: Re-enable team tier when ready
  // team: {
  //   label: "Team",
  //   description: "Collaboration features for larger teams",
  //   color: "text-purple-600 dark:text-purple-400",
  //   badgeVariant: "default",
  //   order: 2,
  // },
};

// =============================================================================
// TIER FEATURE LIMITS
// =============================================================================

interface TierLimits {
  /** Maximum boards per organization */
  boards: number;
  /** Maximum members per organization */
  membersPerOrg: number;
  /** Maximum feedback items per board */
  feedbackPerBoard: number;
  /** Can use custom branding */
  customBranding: boolean;
  /** Has priority support access */
  prioritySupport: boolean;
  /** Has API access */
  apiAccess: boolean;
  /** Has SSO/SAML integration */
  sso: boolean;
  /** Has advanced analytics */
  advancedAnalytics: boolean;
}

/**
 * Feature limits for each tier.
 * Used to gate features and show upgrade prompts.
 */
export const PLAN_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    boards: 1,
    membersPerOrg: 3,
    feedbackPerBoard: 100,
    customBranding: false,
    prioritySupport: false,
    apiAccess: false,
    sso: false,
    advancedAnalytics: false,
  },
  pro: {
    boards: 5,
    membersPerOrg: 10,
    feedbackPerBoard: 1000,
    customBranding: true,
    prioritySupport: false,
    apiAccess: true,
    sso: false,
    advancedAnalytics: false,
  },
  // TODO: Re-enable team tier when ready
  // team: {
  //   boards: 20,
  //   membersPerOrg: 50,
  //   feedbackPerBoard: 5000,
  //   customBranding: true,
  //   prioritySupport: true,
  //   apiAccess: true,
  //   sso: true,
  //   advancedAnalytics: true,
  // },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Map Polar product name to subscription tier.
 * Products should be named: "{Tier} Monthly" or "{Tier} Yearly"
 * e.g., "Pro Monthly", "Team Yearly"
 */
export const mapProductToTier = (
  productName: string | null
): SubscriptionTier => {
  if (!productName) {
    return "free";
  }
  const name = productName.toLowerCase();
  // Check in order of specificity (longer names first)
  // TODO: Re-enable team tier when ready
  // if (name.includes("team")) {
  //   return "team";
  // }
  if (name.includes("pro")) {
    return "pro";
  }
  // Legacy enterprise products map to team
  // TODO: Re-enable team tier when ready
  // if (name.includes("enterprise")) {
  //   return "team";
  // }
  return "free";
};

/**
 * Get limits for a specific tier
 */
export const getTierLimits = (tier: SubscriptionTier) =>
  PLAN_LIMITS[tier] ?? PLAN_LIMITS.free;

/**
 * Get display config for a specific tier
 */
export const getTierDisplay = (tier: SubscriptionTier) =>
  PLAN_TIERS[tier] ?? PLAN_TIERS.free;

/**
 * Check if a tier is a paid tier
 */
export const isPaidTier = (
  tier: SubscriptionTier
): tier is Exclude<SubscriptionTier, "free"> =>
  PAID_TIERS.includes(tier as Exclude<SubscriptionTier, "free">);
