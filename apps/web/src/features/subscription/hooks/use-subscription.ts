import { useQuery } from "@rocicorp/zero/react";
import { useParams } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import type { Subscription } from "@/zero-schema";
import { zql } from "@/zero-schema";
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

  // Query organization with subscription
  const [orgs] = useQuery(
    zql.organization.where("slug", orgSlug ?? "").related("subscriptions")
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
  const { data: session } = authClient.useSession();

  // Get the organization
  const [orgs] = useQuery(
    zql.organization.where("slug", orgSlug ?? "").related("members")
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

  // Get organization ID and current tier
  const [orgs] = useQuery(zql.organization.where("slug", orgSlug ?? ""));
  const org = orgs?.[0];
  const currentTier = (org?.subscriptionTier ?? "free") as SubscriptionTier;

  const initiateCheckout = async (productSlug: string) => {
    if (!org?.id) {
      throw new Error("Organization not found");
    }

    const targetTier = parseTierFromProductSlug(productSlug);

    // Check with Polar for existing subscription (handles db/polar mismatch)
    const checkResponse = await api.api["check-subscription"].$post({
      json: {
        organizationId: org.id,
        targetTier,
      },
    });

    if (checkResponse.ok) {
      const checkData = await checkResponse.json();

      // If user has active subscription but can't checkout (same tier),
      // trigger a sync to fix the db mismatch and throw error
      if ("canCheckout" in checkData && !checkData.canCheckout) {
        // Trigger background sync to update the database
        api.api["sync-subscription"]
          .$post({
            json: { organizationId: org.id },
          })
          .catch((err: unknown) =>
            console.warn("[Checkout] Background sync failed:", err)
          );

        const errorMessage =
          ("message" in checkData && checkData.message) ||
          `You already have an active ${PLAN_TIERS[targetTier ?? currentTier].label} subscription`;

        throw new Error(errorMessage);
      }
    }

    // Only continue if we passed the subscription check
    // This handles users who signed up before Polar was integrated
    try {
      const ensureResponse = await api.api["ensure-customer"].$post();

      if (ensureResponse.ok) {
        const ensureData = await ensureResponse.json();
        if ("created" in ensureData && ensureData.created) {
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
 *
 * This hook ensures the customer exists in Polar before opening the portal.
 * Users who signed up before Polar was configured will have their customer
 * record created automatically.
 */
export function useCustomerPortal() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug?: string };

  const [orgs] = useQuery(zql.organization.where("slug", orgSlug ?? ""));
  const org = orgs?.[0];

  const openPortal = async () => {
    console.log("[useCustomerPortal] Starting portal open flow...");
    console.log("[useCustomerPortal] orgSlug:", orgSlug, "org:", org?.id);

    if (!org?.id) {
      console.error("[useCustomerPortal] Organization not found");
      throw new Error("Organization not found");
    }

    // Step 1: Ensure customer exists in Polar before opening portal
    // This handles users who signed up before Polar was configured
    console.log("[useCustomerPortal] Step 1: Calling ensure-customer API...");
    try {
      const ensureResponse = await api.api["ensure-customer"].$post();
      console.log(
        "[useCustomerPortal] ensure-customer response status:",
        ensureResponse.status
      );

      if (!ensureResponse.ok) {
        const errorData = await ensureResponse.json();
        console.error(
          "[useCustomerPortal] ensure-customer failed:",
          JSON.stringify(errorData, null, 2)
        );

        // Extract error code and provide user-friendly message
        const errorCode =
          "code" in errorData ? (errorData.code as string) : null;
        let userMessage =
          "details" in errorData
            ? (errorData.details as string)
            : "Failed to create customer record";

        if (errorCode === "CUSTOMER_ID_MISMATCH") {
          userMessage =
            "Your billing account is linked to a different user. Please contact support.";
        } else if (errorCode === "EXTERNAL_ID_SET_FAILED") {
          userMessage =
            "Could not link your account to billing system. Please contact support.";
        }

        throw new Error(userMessage);
      }

      const ensureData = await ensureResponse.json();
      console.log(
        "[useCustomerPortal] ensure-customer success:",
        JSON.stringify(ensureData, null, 2)
      );
      if ("created" in ensureData && ensureData.created) {
        console.log("[useCustomerPortal] ✅ Created new Polar customer");
        // Wait a moment for Polar to propagate the customer data
        console.log("[useCustomerPortal] Waiting 1s for Polar propagation...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        console.log("[useCustomerPortal] ✅ Customer already exists");
      }
    } catch (error) {
      // If ensure-customer fails, throw a user-friendly error
      console.error(
        "[useCustomerPortal] ensure-customer exception:",
        error instanceof Error ? error.message : error
      );
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to set up subscription management. Please try again later."
      );
    }

    // Step 2: Open the portal
    console.log(
      "[useCustomerPortal] Step 2: Calling authClient.customer.portal()..."
    );
    try {
      const result = await authClient.customer.portal();
      console.log(
        "[useCustomerPortal] portal() result:",
        JSON.stringify(result, null, 2)
      );

      if (result?.error) {
        console.error(
          "[useCustomerPortal] portal() returned error:",
          result.error
        );
        // Extract detailed error information
        const errorCode = result.error.code ?? "UNKNOWN_ERROR";
        const errorMessage = result.error.message ?? "Portal access failed";
        const statusCode = result.error.status ?? 500;

        // Provide more context based on error code
        let userMessage = errorMessage;
        if (errorCode === "CUSTOMER_PORTAL_CREATION_FAILED") {
          userMessage = `Customer portal creation failed. This may happen if your account is not properly linked to the billing system. Please contact support. (Error: ${errorCode}, Status: ${statusCode})`;
        } else {
          userMessage = `${errorMessage} (Error: ${errorCode}, Status: ${statusCode})`;
        }

        throw new Error(userMessage);
      }

      if (result?.data?.url) {
        console.log("[useCustomerPortal] ✅ Redirecting to:", result.data.url);
        window.location.href = result.data.url;
      } else {
        console.error("[useCustomerPortal] No URL in portal response");
        throw new Error("No portal URL returned from billing system");
      }

      return result;
    } catch (error) {
      console.error(
        "[useCustomerPortal] portal() exception:",
        error instanceof Error ? error.message : error,
        error
      );
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to access subscription portal. Please try again later."
      );
    }
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

  const [orgs] = useQuery(zql.organization.where("slug", orgSlug ?? ""));
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

  const syncSubscription = async () => {
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
      const response = await api.api["sync-subscription"].$post({
        json: { organizationId: org.id },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error("error" in data ? data.error : "Sync failed");
      }

      lastSyncTime.current = Date.now();
      setCooldownRemaining(SYNC_COOLDOWN_MS);

      if ("synced" in data && data.synced) {
        setSyncResult({
          status: "success",
          message: `Synced to ${"subscription" in data ? data.subscription.tier : "unknown"} plan`,
        });
      } else {
        setSyncResult({
          status: "no-subscription",
          message:
            "message" in data ? data.message : "No active subscription found",
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
  };

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
