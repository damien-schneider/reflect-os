/**
 * Subscription utility functions.
 * Helper functions for tier parsing and validation.
 */

import { PAID_TIERS, PLAN_TIERS, type SubscriptionTier } from "./tiers.config";

/**
 * Parse a Polar product name to extract the tier.
 * Expected format: "{TierLabel} Monthly" or "{TierLabel} Yearly"
 *
 * @example
 * parseTierFromProductName("Pro Monthly") // "pro"
 * parseTierFromProductName("Invalid") // null
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
 * Parse a Polar product slug to extract the tier.
 * Expected format: "{tier-label}-monthly" or "{tier-label}-yearly"
 *
 * @example
 * parseTierFromProductSlug("pro-monthly") // "pro"
 * parseTierFromProductSlug("invalid") // null
 */
export function parseTierFromProductSlug(
  productSlug: string
): Exclude<SubscriptionTier, "free"> | null {
  const normalizedSlug = productSlug.toLowerCase();

  // Check each paid tier (sorted by label length descending for specificity)
  const sortedTiers = [...PAID_TIERS].sort(
    (a, b) => PLAN_TIERS[b].label.length - PLAN_TIERS[a].label.length
  );

  for (const tierKey of sortedTiers) {
    const tierLabel = PLAN_TIERS[tierKey].label.toLowerCase();
    if (normalizedSlug.startsWith(tierLabel)) {
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
 */
export function getTierWithFallback(tier: string | null): SubscriptionTier {
  if (!tier) {
    return "free";
  }
  // TODO: Re-enable team tier when ready
  // Handle legacy enterprise tier -> migrate to team
  // if (tier === "enterprise") {
  //   return "team";
  // }
  return isValidTier(tier) ? tier : "free";
}

/**
 * Get sorted paid tier keys for display (ordered by tier.order)
 */
export function getSortedPaidTiers(): Exclude<SubscriptionTier, "free">[] {
  return [...PAID_TIERS].sort(
    (a, b) => PLAN_TIERS[a].order - PLAN_TIERS[b].order
  );
}
