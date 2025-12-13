/**
 * Subscription Routes
 *
 * Handles subscription management: ensuring customers, syncing, and checking status.
 */

import { Hono } from "hono";
import {
  auth,
  dbPool,
  mapProductToTier,
  polarClient,
  updateOrgSubscription,
  upsertSubscription,
} from "../auth";

const app = new Hono();

// =============================================================================
// ENSURE CUSTOMER
// =============================================================================

app.post("/ensure-customer", async (c) => {
  if (!polarClient) {
    return c.json({ error: "Polar not configured" }, 500);
  }

  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const userName = session.user.name;

    // Try to find existing customer by email
    try {
      const existingCustomers = await polarClient.customers.list({
        email: userEmail,
      });

      if (existingCustomers.result.items.length > 0) {
        console.log(
          "[API /ensure-customer] Customer already exists for user:",
          userId
        );
        return c.json({
          success: true,
          customerId: existingCustomers.result.items[0].id,
          created: false,
        });
      }
    } catch {
      // Customer doesn't exist, we'll create one
    }

    // Create customer
    console.log("[API /ensure-customer] Creating customer for user:", userId);
    const customer = await polarClient.customers.create({
      externalId: userId,
      email: userEmail,
      name: userName ?? undefined,
    });

    console.log(
      "[API /ensure-customer] ✅ Customer created:",
      customer.id,
      "for user:",
      userId
    );
    return c.json({
      success: true,
      customerId: customer.id,
      created: true,
    });
  } catch (error) {
    console.error("[API /ensure-customer] Error:", error);
    return c.json(
      {
        error: "Failed to ensure customer",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// =============================================================================
// SYNC SUBSCRIPTION
// =============================================================================

app.post("/sync-subscription", async (c) => {
  if (!polarClient) {
    return c.json({ error: "Polar not configured" }, 500);
  }

  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { organizationId } = body as { organizationId?: string };

    if (!organizationId) {
      return c.json({ error: "Organization ID required" }, 400);
    }

    console.log(
      "[API /sync-subscription] Syncing for org:",
      organizationId,
      "user:",
      session.user.id
    );

    // First, verify the user is a member/owner of this organization
    const memberCheck = await dbPool.query(
      'SELECT role FROM member WHERE "organizationId" = $1 AND "userId" = $2',
      [organizationId, session.user.id]
    );

    if (memberCheck.rows.length === 0) {
      return c.json({ error: "Not a member of this organization" }, 403);
    }

    const userRole = memberCheck.rows[0].role;
    if (userRole !== "owner") {
      return c.json({ error: "Only owners can sync subscription" }, 403);
    }

    // Find customer by user email
    const customerEmail = session.user.email;
    let customerId: string | null = null;

    try {
      const customers = await polarClient.customers.list({
        email: customerEmail,
      });

      if (customers.result.items.length > 0) {
        customerId = customers.result.items[0].id;
        console.log(
          "[API /sync-subscription] Found customer:",
          customerId,
          "for email:",
          customerEmail
        );
      }
    } catch (error) {
      console.warn("[API /sync-subscription] Failed to find customer:", error);
    }

    if (!customerId) {
      return c.json({
        synced: false,
        message: "No Polar customer found for this account",
      });
    }

    // Get active subscriptions for this customer
    const subscriptions = await polarClient.subscriptions.list({
      customerId,
      active: true,
    });

    console.log(
      "[API /sync-subscription] Found",
      subscriptions.result.items.length,
      "active subscriptions"
    );

    // Look for subscription with matching referenceId (org ID in metadata)
    // or just take the first active subscription if there's only one
    let targetSubscription = subscriptions.result.items.find(
      (s) => s.metadata?.referenceId === organizationId
    );

    // If no exact match, check if there's only one active subscription
    // (common case: user has one org and one subscription)
    if (!targetSubscription && subscriptions.result.items.length === 1) {
      targetSubscription = subscriptions.result.items[0];
      console.log(
        "[API /sync-subscription] Using single active subscription:",
        targetSubscription.id
      );
    }

    if (!targetSubscription) {
      // Check if subscription exists but is not active
      const allSubscriptions = await polarClient.subscriptions.list({
        customerId,
      });

      if (allSubscriptions.result.items.length > 0) {
        // User has subscriptions but none are active - downgrade to free
        const latestSub = allSubscriptions.result.items[0];
        const latestStatus = latestSub.status;

        await updateOrgSubscription(organizationId, {
          subscriptionId: latestSub.id,
          tier: "free",
          status: latestStatus,
        });

        console.log(
          "[API /sync-subscription] ⬇️ Downgraded org to free:",
          organizationId,
          "previous subscription status:",
          latestStatus
        );

        return c.json({
          synced: true,
          downgraded: true,
          subscription: {
            id: latestSub.id,
            tier: "free",
            status: latestStatus,
            productName: latestSub.product?.name ?? null,
          },
          message:
            "No active subscription found. Your subscription may have expired or been canceled.",
        });
      }

      // No subscriptions at all - ensure org is on free tier
      await updateOrgSubscription(organizationId, {
        subscriptionId: "",
        tier: "free",
        status: "none",
      });

      console.log(
        "[API /sync-subscription] ⬇️ Reset org to free (no subscriptions):",
        organizationId
      );

      return c.json({
        synced: true,
        downgraded: true,
        subscription: {
          id: null,
          tier: "free",
          status: "none",
          productName: null,
        },
        message: "No subscription found for this account",
      });
    }

    // Update the database with subscription info
    const sub = targetSubscription;
    const productName = sub.product?.name ?? null;
    const tier = mapProductToTier(productName);

    await upsertSubscription({
      id: sub.id,
      organizationId,
      polarCustomerId: sub.customerId,
      polarProductId: sub.productId,
      polarProductName: productName,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart
        ? new Date(sub.currentPeriodStart).getTime()
        : undefined,
      currentPeriodEnd: sub.currentPeriodEnd
        ? new Date(sub.currentPeriodEnd).getTime()
        : undefined,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    });

    await updateOrgSubscription(organizationId, {
      subscriptionId: sub.id,
      tier,
      status: sub.status,
    });

    console.log(
      "[API /sync-subscription] ✅ Synced subscription:",
      sub.id,
      "tier:",
      tier,
      "status:",
      sub.status
    );

    return c.json({
      synced: true,
      subscription: {
        id: sub.id,
        tier,
        status: sub.status,
        productName,
      },
    });
  } catch (error) {
    console.error("[API /sync-subscription] Error:", error);
    return c.json(
      {
        error: "Failed to sync subscription",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// =============================================================================
// CHECK SUBSCRIPTION
// =============================================================================

app.post("/check-subscription", async (c) => {
  if (!polarClient) {
    return c.json({ error: "Polar not configured" }, 500);
  }

  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { organizationId, targetTier } = body as {
      organizationId?: string;
      targetTier?: string;
    };

    if (!organizationId) {
      return c.json({ error: "Organization ID required" }, 400);
    }

    console.log(
      "[API /check-subscription] Checking for org:",
      organizationId,
      "user:",
      session.user.id,
      "targetTier:",
      targetTier
    );

    // Find customer by user email
    const customerEmail = session.user.email;
    let customerId: string | null = null;

    try {
      const customers = await polarClient.customers.list({
        email: customerEmail,
      });

      if (customers.result.items.length > 0) {
        customerId = customers.result.items[0].id;
      }
    } catch {
      // Customer doesn't exist - no subscription
    }

    if (!customerId) {
      return c.json({
        hasActiveSubscription: false,
        canCheckout: true,
      });
    }

    // Get active subscriptions for this customer
    const subscriptions = await polarClient.subscriptions.list({
      customerId,
      active: true,
    });

    if (subscriptions.result.items.length === 0) {
      return c.json({
        hasActiveSubscription: false,
        canCheckout: true,
      });
    }

    // Find matching subscription (by referenceId or single subscription)
    let activeSubscription = subscriptions.result.items.find(
      (s) => s.metadata?.referenceId === organizationId
    );

    if (!activeSubscription && subscriptions.result.items.length === 1) {
      activeSubscription = subscriptions.result.items[0];
    }

    if (!activeSubscription) {
      return c.json({
        hasActiveSubscription: false,
        canCheckout: true,
      });
    }

    // User has an active subscription - check if it matches target tier
    const productName = activeSubscription.product?.name ?? null;
    const currentTier = mapProductToTier(productName);

    console.log(
      "[API /check-subscription] Found active subscription:",
      activeSubscription.id,
      "tier:",
      currentTier,
      "targetTier:",
      targetTier
    );

    // If target tier matches current tier, block checkout
    if (targetTier && currentTier === targetTier) {
      return c.json({
        hasActiveSubscription: true,
        canCheckout: false,
        currentTier,
        productName,
        message: `You already have an active ${productName} subscription. Use "Manage Subscription" to modify your plan.`,
      });
    }

    // User has subscription but wants different tier - allow (Polar handles upgrade/downgrade)
    return c.json({
      hasActiveSubscription: true,
      canCheckout: true,
      currentTier,
      productName,
      message: `You have an active ${productName} subscription. This will be upgraded/changed.`,
    });
  } catch (error) {
    console.error("[API /check-subscription] Error:", error);
    // On error, allow checkout - Polar will handle validation
    return c.json({
      hasActiveSubscription: false,
      canCheckout: true,
      error: error instanceof Error ? error.message : "Check failed",
    });
  }
});

export default app;
