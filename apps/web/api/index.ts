import { Polar } from "@polar-sh/sdk";
import { PushProcessor } from "@rocicorp/zero/server";
import { zeroNodePg } from "@rocicorp/zero/server/adapters/pg";
import { Hono } from "hono";
import { handle } from "hono/vercel";
import { SignJWT } from "jose";
import { Pool } from "pg";
import { serverEnv } from "../src/env/server";
import { createMutators } from "../src/mutators";
import { schema } from "../src/zero-schema";
import {
  auth,
  dbPool as authDbPool,
  polarClient as authPolarClient,
  mapProductToTier,
  updateOrgSubscription,
  upsertSubscription,
} from "./auth";
import { createServerMutators } from "./server-mutators";

export const config = {
  runtime: "edge",
};

// Initialize Polar client for products endpoint
const polarClient = serverEnv.POLAR_ACCESS_TOKEN
  ? new Polar({
      accessToken: serverEnv.POLAR_ACCESS_TOKEN,
      server:
        serverEnv.POLAR_ENVIRONMENT === "production" ? "production" : "sandbox",
    })
  : null;

// Database pool for limit checks
const dbPool = new Pool({
  connectionString: serverEnv.ZERO_UPSTREAM_DB,
});

export const app = new Hono().basePath("/api");

app.on(["POST", "GET"], "/auth/**", (c) => auth.handler(c.req.raw));

// Fetch available products from Polar
// Products should be named: "{Tier} Monthly" or "{Tier} Yearly"
// e.g., "Pro Monthly", "Pro Yearly", "Team Monthly", "Team Yearly"
app.get("/products", async (c) => {
  if (!polarClient) {
    return c.json({ error: "Polar not configured", products: [] }, 200);
  }

  try {
    const response = await polarClient.products.list({
      isRecurring: true,
      isArchived: false,
    });

    // Transform to client-friendly format
    // Tier is parsed from product name on the client
    const products = response.result.items.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      slug: product.name.toLowerCase().replace(/\s+/g, "-"),
      isRecurring: product.isRecurring,
      recurringInterval: product.recurringInterval,
      prices: product.prices.map((price) => ({
        id: price.id,
        amount:
          "amountType" in price && price.amountType === "fixed"
            ? price.priceAmount
            : null,
        currency: "priceCurrency" in price ? price.priceCurrency : "usd",
        type: price.type,
      })),
      benefits: product.benefits.map((benefit) => ({
        id: benefit.id,
        type: benefit.type,
        description: benefit.description,
      })),
    }));

    return c.json({ products });
  } catch (error) {
    console.error("[API /products] Error:", error);
    return c.json({ error: "Failed to fetch products", products: [] }, 200);
  }
});

// Ensure Polar customer exists for the current user
// This is called before checkout to handle users who signed up before Polar was integrated
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

app.get("/zero-token", async (c) => {
  try {
    console.log("[API /zero-token] Fetching session...");

    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      console.log("[API /zero-token] No session found, returning 401");
      return c.text("Unauthorized", 401);
    }

    console.log("[API /zero-token] Session found for user:", session.user.id);

    if (!serverEnv.ZERO_AUTH_SECRET) {
      console.error("[API /zero-token] ❌ ZERO_AUTH_SECRET is not configured");
      return c.json(
        { error: "Server misconfigured: ZERO_AUTH_SECRET not set" },
        500
      );
    }

    const jwtPayload = {
      sub: session.user.id,
      iat: Math.floor(Date.now() / 1000),
    };

    const jwt = await new SignJWT(jwtPayload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30days")
      .sign(new TextEncoder().encode(serverEnv.ZERO_AUTH_SECRET));

    console.log(
      "[API /zero-token] ✅ Token generated successfully for user:",
      session.user.id
    );
    return c.json({ token: jwt });
  } catch (error) {
    console.error("[API /zero-token] ❌ Error generating token:", error);
    return c.json(
      {
        error: "Failed to generate token",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Initialize PushProcessor for Zero custom mutators
// This encapsulates the standard push protocol implementation
const pushProcessor = new PushProcessor(zeroNodePg(schema, dbPool));

// Push endpoint for Zero custom mutators
// This receives mutations from the client and validates them server-side
app.post("/push", async (c) => {
  try {
    // Get auth data from JWT token in the request
    // PushProcessor extracts the JWT from the Authorization header
    const authHeader = c.req.header("Authorization");
    let authData: { sub: string | null } = { sub: null };

    if (authHeader?.startsWith("Bearer ")) {
      // The token is a JWT signed with ZERO_AUTH_SECRET
      // We can decode the payload to get the user ID
      const token = authHeader.slice(7);
      try {
        // Decode JWT payload (base64url encoded)
        const [, payloadB64] = token.split(".");
        if (payloadB64) {
          const payload = JSON.parse(
            atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
          );
          authData = { sub: payload.sub ?? null };
        }
      } catch {
        console.warn("[API /push] Failed to decode JWT payload");
      }
    }

    console.log("[API /push] Processing push for user:", authData.sub);

    // Create client mutators, then wrap with server-side validation
    const clientMutators = createMutators(authData);
    const serverMutators = createServerMutators(authData, clientMutators);

    // Process the push request with server mutators
    // Mutations that throw errors are skipped, not rolled back
    const result = await pushProcessor.process(serverMutators, c.req.raw);

    return c.json(result);
  } catch (error) {
    console.error("[API /push] Error:", error);
    // Throwing an error here will cause the client to resend all queued mutations
    return c.json(
      {
        error: "Failed to process push",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export default handle(app);

// =============================================================================
// SYNC SUBSCRIPTION ENDPOINT
// =============================================================================

// Sync subscription status from Polar to local database
// This is used when webhooks fail or are not configured
app.post("/sync-subscription", async (c) => {
  // Use the polar client from auth.ts (already initialized)
  if (!authPolarClient) {
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
    const memberCheck = await authDbPool.query(
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
      const customers = await authPolarClient.customers.list({
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
    const subscriptions = await authPolarClient.subscriptions.list({
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
      const allSubscriptions = await authPolarClient.subscriptions.list({
        customerId,
      });

      if (allSubscriptions.result.items.length > 0) {
        // User has subscriptions but none are active - downgrade to free
        // Find the most recent subscription to get its status
        const latestSub = allSubscriptions.result.items[0];
        const latestStatus = latestSub.status; // e.g., "canceled"

        // Update organization to free tier
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
// CHECK SUBSCRIPTION ENDPOINT
// =============================================================================

// Check if user already has an active subscription on Polar
// This is called before checkout to prevent duplicate subscriptions
app.post("/check-subscription", async (c) => {
  if (!authPolarClient) {
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
      const customers = await authPolarClient.customers.list({
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
    const subscriptions = await authPolarClient.subscriptions.list({
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
