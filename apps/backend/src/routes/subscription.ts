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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complex subscription logic with multiple API calls
app.post("/ensure-customer", async (c) => {
  console.log("[API /ensure-customer] Request received");

  if (!polarClient) {
    console.error(
      "[API /ensure-customer] Polar not configured - polarClient is null"
    );
    return c.json({ error: "Polar not configured" }, 500);
  }

  console.log("[API /ensure-customer] polarClient is available");

  try {
    console.log("[API /ensure-customer] Getting session...");
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      console.error("[API /ensure-customer] No session found");
      return c.json({ error: "Unauthorized" }, 401);
    }

    console.log(
      "[API /ensure-customer] Session found for user:",
      session.user.id
    );

    const userId = session.user.id;
    const userEmail = session.user.email;
    const userName = session.user.name;

    console.log("[API /ensure-customer] User details:", {
      userId,
      userEmail,
      userName,
    });

    // Try to find existing customer by email
    try {
      console.log(
        "[API /ensure-customer] Searching for existing customer by email:",
        userEmail
      );
      const existingCustomers = await polarClient.customers.list({
        email: userEmail,
      });

      console.log(
        "[API /ensure-customer] Search result:",
        existingCustomers.result.items.length,
        "customers found"
      );

      if (existingCustomers.result.items.length > 0) {
        const existingCustomer = existingCustomers.result.items[0];
        console.log(
          "[API /ensure-customer] ✅ Customer already exists for user:",
          userId,
          "customerId:",
          existingCustomer.id,
          "externalId:",
          existingCustomer.externalId
        );

        // IMPORTANT: If the customer exists but doesn't have the correct externalId,
        // we need to update it so the portal plugin can find them by user ID.
        // NOTE: According to Polar docs, externalId can only be set once, not updated.
        // If it's already set to something else, we need to handle that case.
        if (existingCustomer.externalId !== userId) {
          // If externalId is null/undefined, we can set it
          if (existingCustomer.externalId) {
            // externalId is already set to a different value - we cannot change it
            console.error(
              "[API /ensure-customer] ❌ Customer has different externalId that cannot be changed:",
              existingCustomer.externalId,
              "expected:",
              userId
            );

            // Option 1: Delete the old customer and create new one with correct externalId
            // This is risky as it may lose subscription history
            console.log(
              "[API /ensure-customer] Attempting to delete and recreate customer..."
            );
            try {
              // Delete the existing customer
              await polarClient.customers.delete({
                id: existingCustomer.id,
              });
              console.log(
                "[API /ensure-customer] Deleted old customer:",
                existingCustomer.id
              );

              // Create new customer with correct externalId
              const newCustomer = await polarClient.customers.create({
                externalId: userId,
                email: userEmail,
                name: userName ?? undefined,
              });
              console.log(
                "[API /ensure-customer] ✅ Created new customer:",
                newCustomer.id,
                "with correct externalId"
              );

              return c.json({
                success: true,
                customerId: newCustomer.id,
                created: true,
                recreated: true,
              });
            } catch (recreateError) {
              console.error(
                "[API /ensure-customer] ❌ Failed to recreate customer:",
                recreateError
              );
              return c.json(
                {
                  error:
                    "Your billing account is linked to a different user ID. Please contact support to resolve this issue.",
                  details:
                    recreateError instanceof Error
                      ? recreateError.message
                      : "Unknown error",
                  code: "CUSTOMER_ID_MISMATCH",
                  existingExternalId: existingCustomer.externalId,
                  expectedExternalId: userId,
                },
                500
              );
            }
          } else {
            console.log(
              "[API /ensure-customer] Setting customer externalId (was empty) to",
              userId
            );
            try {
              await polarClient.customers.update({
                id: existingCustomer.id,
                customerUpdate: {
                  externalId: userId,
                },
              });
              console.log(
                "[API /ensure-customer] ✅ Customer externalId set successfully"
              );

              // Verify the update worked by fetching via externalId
              console.log(
                "[API /ensure-customer] Verifying update via getExternal..."
              );
              const verifyResult = await polarClient.customers.getExternal({
                externalId: userId,
              });
              console.log(
                "[API /ensure-customer] ✅ Verified customer via externalId:",
                verifyResult.id,
                "matches:",
                verifyResult.id === existingCustomer.id
              );
            } catch (updateError) {
              console.error(
                "[API /ensure-customer] ❌ Failed to set customer externalId:",
                updateError
              );
              return c.json(
                {
                  error:
                    "Failed to link customer to your account. Please contact support.",
                  details:
                    updateError instanceof Error
                      ? updateError.message
                      : "Unknown error",
                  code: "EXTERNAL_ID_SET_FAILED",
                },
                500
              );
            }
          }
        } else {
          // externalId already matches - verify it works
          console.log(
            "[API /ensure-customer] externalId already matches userId, verifying..."
          );
          try {
            const verifyResult = await polarClient.customers.getExternal({
              externalId: userId,
            });
            console.log(
              "[API /ensure-customer] ✅ Verified customer can be found by externalId:",
              verifyResult.id
            );
          } catch (verifyError) {
            console.error(
              "[API /ensure-customer] ❌ Customer cannot be found by externalId despite it being set:",
              verifyError
            );
            // This shouldn't happen, but log it for debugging
          }
        }

        return c.json({
          success: true,
          customerId: existingCustomer.id,
          created: false,
        });
      }
    } catch (searchError) {
      // Customer doesn't exist, we'll create one
      console.log(
        "[API /ensure-customer] Customer search failed (will create):",
        searchError
      );
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
