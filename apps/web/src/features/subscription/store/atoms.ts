import { atom } from "jotai";
import type { SubscriptionStatus } from "../status.config";
import { PLAN_LIMITS, type SubscriptionTier } from "../tiers.config";

/**
 * Subscription state atoms.
 * These atoms are derived from the organization data synced via Zero.
 * They provide easy access to subscription information without querying.
 */

// Primitive atoms for subscription state (set from hooks)
export const subscriptionTierAtom = atom<SubscriptionTier>("free");
export const subscriptionStatusAtom = atom<SubscriptionStatus>("none");
export const subscriptionIdAtom = atom<string | null>(null);

// Derived atom to check if subscription is active (active or trialing)
export const isSubscriptionActiveAtom = atom((get) => {
  const status = get(subscriptionStatusAtom);
  return status === "active" || status === "trialing";
});

// Derived atom for current plan limits
export const currentPlanLimitsAtom = atom((get) => {
  const tier = get(subscriptionTierAtom);
  return PLAN_LIMITS[tier];
});

// Derived atom to check if user is on free plan
export const isFreePlanAtom = atom((get) => {
  const tier = get(subscriptionTierAtom);
  return tier === "free";
});

// Derived atom to check if user is on a paid plan
export const isPaidPlanAtom = atom((get) => {
  const tier = get(subscriptionTierAtom);
  return tier !== "free";
});

// Derived atom to check if custom branding is available
export const hasCustomBrandingAtom = atom((get) => {
  const limits = get(currentPlanLimitsAtom);
  return limits.customBranding;
});

// Derived atom to check if API access is available
export const hasApiAccessAtom = atom((get) => {
  const limits = get(currentPlanLimitsAtom);
  return limits.apiAccess;
});

// Derived atom to get max boards for current plan
export const maxBoardsAtom = atom((get) => {
  const limits = get(currentPlanLimitsAtom);
  return limits.boards;
});

// Derived atom to get max members for current plan
export const maxMembersAtom = atom((get) => {
  const limits = get(currentPlanLimitsAtom);
  return limits.membersPerOrg;
});

// Helper atom to check if a specific feature is available
export const createFeatureCheckAtom = (
  feature: keyof (typeof PLAN_LIMITS)["free"]
) =>
  atom((get) => {
    const limits = get(currentPlanLimitsAtom);
    return limits[feature];
  });
