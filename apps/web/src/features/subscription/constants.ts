/**
 * Subscription plan constants and feature limits.
 * These define the tiers available and what features each tier unlocks.
 *
 * Polar products should be named: "{Tier} Monthly" or "{Tier} Yearly"
 * e.g., "Pro Monthly", "Pro Yearly", "Team Monthly", "Team Yearly"
 */

export type SubscriptionTier = "free" | "pro" | "team";
export type BillingInterval = "month" | "year";
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "none";

/**
 * Paid tiers that have Polar products (excludes free).
 * Ordered from lowest to highest tier.
 */
export const PAID_TIERS: Exclude<SubscriptionTier, "free">[] = ["pro", "team"];

/**
 * Plan tier configuration with labels and descriptions.
 */
export const PLAN_TIERS: Record<
  SubscriptionTier,
  {
    label: string;
    description: string;
    color: string;
    badgeVariant: "default" | "secondary" | "outline";
    order: number;
  }
> = {
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
  team: {
    label: "Team",
    description: "Collaboration features for larger teams",
    color: "text-purple-600 dark:text-purple-400",
    badgeVariant: "default",
    order: 2,
  },
};

/**
 * Feature limits per plan tier.
 * Use these to gate features or show upgrade prompts.
 */
export const PLAN_LIMITS: Record<
  SubscriptionTier,
  {
    boards: number;
    membersPerOrg: number;
    feedbackPerBoard: number;
    customBranding: boolean;
    prioritySupport: boolean;
    apiAccess: boolean;
    sso: boolean;
    advancedAnalytics: boolean;
  }
> = {
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
  team: {
    boards: 20,
    membersPerOrg: 50,
    feedbackPerBoard: 5000,
    customBranding: true,
    prioritySupport: true,
    apiAccess: true,
    sso: true,
    advancedAnalytics: true,
  },
};

/**
 * Status display configuration for subscription status badges.
 */
export const STATUS_CONFIG: Record<
  SubscriptionStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className: string;
  }
> = {
  active: {
    label: "Active",
    variant: "default",
    className: "bg-green-600 text-white",
  },
  trialing: {
    label: "Trial",
    variant: "secondary",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  past_due: {
    label: "Past Due",
    variant: "destructive",
    className: "",
  },
  canceled: {
    label: "Canceled",
    variant: "secondary",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  none: {
    label: "No Subscription",
    variant: "outline",
    className: "",
  },
};

/**
 * Parse a Polar product name to extract the tier.
 * Expected format: "{Tier} Monthly" or "{Tier} Yearly"
 * e.g., "Pro Monthly" -> "pro", "Team Yearly" -> "team"
 *
 * @returns The tier key or null if no match
 */
export function parseTierFromProductName(
  productName: string
): Exclude<SubscriptionTier, "free"> | null {
  const normalizedName = productName.toLowerCase();

  // Check each paid tier (sorted by label length descending for specificity)
  const sortedTiers = [...PAID_TIERS].sort(
    (a, b) => PLAN_TIERS[b].label.length - PLAN_TIERS[a].label.length
  );

  for (const tierKey of sortedTiers) {
    const tierLabel = PLAN_TIERS[tierKey].label.toLowerCase();
    if (normalizedName.startsWith(tierLabel)) {
      return tierKey;
    }
  }

  return null;
}

/**
 * Validate if a string is a valid subscription tier.
 * Useful for safely casting database values.
 */
export function isValidTier(tier: string | null): tier is SubscriptionTier {
  if (!tier) {
    return false;
  }
  return tier in PLAN_TIERS;
}

/**
 * Get tier from a value with fallback to free.
 * Safe for use with database values that might be null or invalid.
 * Maps legacy "enterprise" tier to "team".
 */
export function getTierWithFallback(tier: string | null): SubscriptionTier {
  if (!tier) {
    return "free";
  }
  // Handle legacy enterprise tier -> migrate to team
  if (tier === "enterprise") {
    return "team";
  }
  return isValidTier(tier) ? tier : "free";
}
