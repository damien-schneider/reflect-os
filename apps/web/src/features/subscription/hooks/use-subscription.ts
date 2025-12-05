import { useQuery, useZero } from "@rocicorp/zero/react";
import { useParams } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import type { Schema, Subscription } from "@/zero-schema";
import type { SubscriptionStatus } from "../status.config";
import {
  currentPlanLimitsAtom,
  isFreePlanAtom,
  isPaidPlanAtom,
  isSubscriptionActiveAtom,
  subscriptionIdAtom,
  subscriptionStatusAtom,
  subscriptionTierAtom,
} from "../store/atoms";
import { parseTierFromProductSlug } from "../tier.utils";
import {
  type PLAN_LIMITS,
  PLAN_TIERS,
  type SubscriptionTier,
} from "../tiers.config";

/**
 * Hook to get and sync organization subscription data from Zero.
 * This hook queries the organization and updates the Jotai atoms.
 */
export function useSubscription() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug?: string };
  const z = useZero<Schema>();

  // Query organization with subscription
  const [orgs] = useQuery(
    z.query.organization
      .where("slug", "=", orgSlug ?? "")
      .related("subscriptions")
  );
  const org = orgs?.[0];

  // Get subscription from related data or use org-level fields
  const subscription = org?.subscriptions?.[0] as Subscription | undefined;
  const tier = (org?.subscriptionTier ?? "free") as SubscriptionTier;
  const status = (org?.subscriptionStatus ?? "none") as SubscriptionStatus;
  const subscriptionIdValue = org?.subscriptionId ?? null;

  // Update atoms
  const setTier = useSetAtom(subscriptionTierAtom);
  const setStatus = useSetAtom(subscriptionStatusAtom);
  const setSubscriptionId = useSetAtom(subscriptionIdAtom);

  useEffect(() => {
    setTier(tier);
    setStatus(status);
    setSubscriptionId(subscriptionIdValue);
  }, [
    tier,
    status,
    subscriptionIdValue,
    setTier,
    setStatus,
    setSubscriptionId,
  ]);

  // Get derived values from atoms
  const isActive = useAtomValue(isSubscriptionActiveAtom);
  const isFreePlan = useAtomValue(isFreePlanAtom);
  const isPaidPlan = useAtomValue(isPaidPlanAtom);
  const limits = useAtomValue(currentPlanLimitsAtom);

  // Plan display info
  const planInfo = PLAN_TIERS[tier];

  return {
    // Raw data
    organization: org,
    subscription,
    tier,
    status,

    // Computed values
    isActive,
    isFreePlan,
    isPaidPlan,
    limits,
    planInfo,

    // Loading state
    isLoading: !org,
  };
}

/**
 * Hook to check if current user can manage subscription (owner only).
 */
export function useCanManageSubscription() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug?: string };
  const z = useZero<Schema>();
  const { data: session } = authClient.useSession();

  // Get the organization
  const [orgs] = useQuery(
    z.query.organization.where("slug", "=", orgSlug ?? "").related("members")
  );
  const org = orgs?.[0];

  // Find current user's membership
  const currentMember = org?.members?.find(
    (m) => m.userId === session?.user?.id
  );

  // Only owners can manage subscription
  const canManage = currentMember?.role === "owner";

  return {
    canManage,
    role: currentMember?.role,
    isOwner: currentMember?.role === "owner",
    isAdmin: currentMember?.role === "admin",
    isMember: currentMember?.role === "member",
  };
}

/**
 * Hook for subscription checkout - initiates Polar checkout flow.
 * Checks with Polar first to prevent duplicate subscriptions.
 */
export function useSubscriptionCheckout() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug?: string };
  const z = useZero<Schema>();

  // Get organization ID and current tier
  const [orgs] = useQuery(
    z.query.organization.where("slug", "=", orgSlug ?? "")
  );
  const org = orgs?.[0];
  const currentTier = (org?.subscriptionTier ?? "free") as SubscriptionTier;

  const initiateCheckout = async (productSlug: string) => {
    if (!org?.id) {
      throw new Error("Organization not found");
    }

    const targetTier = parseTierFromProductSlug(productSlug);

    // Check with Polar for existing subscription (handles db/polar mismatch)
    const checkResponse = await fetch("/api/check-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: org.id,
        targetTier,
      }),
    });

    if (checkResponse.ok) {
      const checkData = await checkResponse.json();

      // If user has active subscription but can't checkout (same tier),
      // trigger a sync to fix the db mismatch and throw error
      if (!checkData.canCheckout) {
        // Trigger background sync to update the database
        fetch("/api/sync-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId: org.id }),
        }).catch((err) =>
          console.warn("[Checkout] Background sync failed:", err)
        );

        const errorMessage =
          checkData.message ||
          `You already have an active ${PLAN_TIERS[targetTier ?? currentTier].label} subscription`;

        throw new Error(errorMessage);
      }
    }

    // Only continue if we passed the subscription check
    // This handles users who signed up before Polar was integrated
    try {
      const ensureResponse = await fetch("/api/ensure-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (ensureResponse.ok) {
        const ensureData = await ensureResponse.json();
        if (ensureData.created) {
          console.log("[Checkout] Created new Polar customer");
        }
      } else {
        console.warn("[Checkout] Failed to ensure customer, proceeding anyway");
      }
    } catch (error) {
      console.warn("[Checkout] Error ensuring customer:", error);
      // Continue with checkout - Polar may still work
    }

    // Call the Polar checkout endpoint via better-auth
    // Use slug instead of products array - the slug maps to product ID server-side
    // referenceId is stored in metadata and used by webhooks to update the org
    const result = await authClient.checkout({
      slug: productSlug,
      referenceId: org.id,
    });

    if (result?.error) {
      console.error("[Checkout] Error:", result.error);
      throw new Error(
        result.error.message ?? "Failed to create checkout session"
      );
    }

    if (result?.data?.url) {
      window.location.href = result.data.url;
    } else {
      throw new Error("No checkout URL returned");
    }

    return result;
  };

  return {
    initiateCheckout,
    organizationId: org?.id,
    currentTier,
  };
}

/**
 * Hook to open customer portal for managing subscription.
 */
export function useCustomerPortal() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug?: string };
  const z = useZero<Schema>();

  const [orgs] = useQuery(
    z.query.organization.where("slug", "=", orgSlug ?? "")
  );
  const org = orgs?.[0];

  const openPortal = async () => {
    if (!org?.id) {
      throw new Error("Organization not found");
    }

    // Call the Polar customer portal endpoint
    const result = await authClient.customer.portal();

    if (result?.data?.url) {
      window.location.href = result.data.url;
    }

    return result;
  };

  return {
    openPortal,
    organizationId: org?.id,
  };
}

/**
 * Hook to check if a usage limit has been reached.
 */
export function useLimitCheck(
  currentCount: number,
  limitKey: keyof (typeof PLAN_LIMITS)["free"]
) {
  const limits = useAtomValue(currentPlanLimitsAtom);
  const tier = useAtomValue(subscriptionTierAtom);

  const limit = limits[limitKey];

  // Handle boolean limits (features)
  if (typeof limit === "boolean") {
    return {
      hasLimit: true,
      isEnabled: limit,
      isLimitReached: !limit,
      current: currentCount,
      max: limit ? 1 : 0,
      remaining: limit ? 1 : 0,
      percentUsed: limit ? 0 : 100,
    };
  }

  // Handle numeric limits
  const isLimitReached = currentCount >= limit;
  const remaining = Math.max(0, limit - currentCount);
  const percentUsed =
    limit === Number.POSITIVE_INFINITY ? 0 : (currentCount / limit) * 100;

  return {
    hasLimit: limit !== Number.POSITIVE_INFINITY,
    isEnabled: true,
    isLimitReached,
    current: currentCount,
    max: limit,
    remaining,
    percentUsed: Math.min(100, percentUsed),
    tier,
  };
}

/**
 * Hook to check if a feature is available on current plan.
 */
export function useFeatureAccess(
  feature: keyof (typeof PLAN_LIMITS)["free"]
): boolean {
  const limits = useAtomValue(currentPlanLimitsAtom);
  const value = limits[feature];

  if (typeof value === "boolean") {
    return value;
  }

  // For numeric limits, consider it accessible if limit > 0
  return value > 0;
}

// Cooldown duration in milliseconds (10 seconds)
const SYNC_COOLDOWN_MS = 10_000;

/**
 * Hook to sync subscription status from Polar to local database.
 * Includes 10-second cooldown to prevent spamming.
 */
export function useSubscriptionSync() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug?: string };
  const z = useZero<Schema>();

  const [orgs] = useQuery(
    z.query.organization.where("slug", "=", orgSlug ?? "")
  );
  const org = orgs?.[0];

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    status: "idle" | "success" | "error" | "no-subscription";
    message?: string;
  }>({ status: "idle" });
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const lastSyncTime = useRef<number>(0);

  // Update cooldown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) {
      return;
    }

    const timer = setInterval(() => {
      const remaining = Math.max(
        0,
        SYNC_COOLDOWN_MS - (Date.now() - lastSyncTime.current)
      );
      setCooldownRemaining(remaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const syncSubscription = useCallback(async () => {
    if (!org?.id) {
      setSyncResult({ status: "error", message: "Organization not found" });
      return;
    }

    // Check cooldown
    const timeSinceLastSync = Date.now() - lastSyncTime.current;
    if (timeSinceLastSync < SYNC_COOLDOWN_MS) {
      const remaining = Math.ceil(
        (SYNC_COOLDOWN_MS - timeSinceLastSync) / 1000
      );
      setSyncResult({
        status: "error",
        message: `Please wait ${remaining} seconds before syncing again`,
      });
      return;
    }

    setIsSyncing(true);
    setSyncResult({ status: "idle" });

    try {
      const response = await fetch("/api/sync-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: org.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Sync failed");
      }

      lastSyncTime.current = Date.now();
      setCooldownRemaining(SYNC_COOLDOWN_MS);

      if (data.synced) {
        setSyncResult({
          status: "success",
          message: `Synced to ${data.subscription.tier} plan`,
        });
      } else {
        setSyncResult({
          status: "no-subscription",
          message: data.message || "No active subscription found",
        });
      }
    } catch (error) {
      setSyncResult({
        status: "error",
        message: error instanceof Error ? error.message : "Sync failed",
      });
    } finally {
      setIsSyncing(false);
    }
  }, [org?.id]);

  const isOnCooldown = cooldownRemaining > 0;
  const cooldownSeconds = Math.ceil(cooldownRemaining / 1000);

  return {
    syncSubscription,
    isSyncing,
    syncResult,
    isOnCooldown,
    cooldownSeconds,
    organizationId: org?.id,
  };
}
