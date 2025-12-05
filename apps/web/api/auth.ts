import { checkout, polar, portal, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { Pool } from "pg";
import { serverEnv } from "../src/env/server";

const isProduction = serverEnv.NODE_ENV === "production";

console.log("Better Auth initialized with:", {
  baseURL: serverEnv.BETTER_AUTH_URL,
  isProduction,
  databaseConnected: !!serverEnv.ZERO_UPSTREAM_DB,
});

// Initialize Polar client (only if access token is configured)
// Exported for use in sync-subscription endpoint
export const polarClient = serverEnv.POLAR_ACCESS_TOKEN
  ? new Polar({
      accessToken: serverEnv.POLAR_ACCESS_TOKEN,
      server:
        serverEnv.POLAR_ENVIRONMENT === "production" ? "production" : "sandbox",
    })
  : null;

// Database pool for direct queries (used in webhook handlers)
// Exported for use in sync-subscription endpoint
export const dbPool = new Pool({
  connectionString: serverEnv.ZERO_UPSTREAM_DB,
});

// Helper to map Polar product name to subscription tier
// Products should be named: "{Tier} Monthly" or "{Tier} Yearly"
// Exported for use in sync-subscription endpoint
export const mapProductToTier = (productName: string | null): string => {
  if (!productName) {
    return "free";
  }
  const name = productName.toLowerCase();
  // Check in order of specificity (longer names first)
  if (name.includes("team")) {
    return "team";
  }
  if (name.includes("pro")) {
    return "pro";
  }
  // Legacy enterprise products map to team
  if (name.includes("enterprise")) {
    return "team";
  }
  return "free";
};

// Helper to update organization subscription in database
// Exported for use in sync-subscription endpoint
export const updateOrgSubscription = async (
  organizationId: string,
  subscriptionData: {
    subscriptionId: string;
    tier: string;
    status: string;
  }
) => {
  try {
    await dbPool.query(
      `UPDATE organization 
       SET subscription_id = $1, 
           subscription_tier = $2, 
           subscription_status = $3 
       WHERE id = $4`,
      [
        subscriptionData.subscriptionId,
        subscriptionData.tier,
        subscriptionData.status,
        organizationId,
      ]
    );
    console.log(
      `[Polar] Updated org ${organizationId} subscription:`,
      subscriptionData
    );
  } catch (error) {
    console.error(`[Polar] Failed to update org ${organizationId}:`, error);
  }
};

// Helper to upsert subscription record
// Exported for use in sync-subscription endpoint
export const upsertSubscription = async (subscriptionData: {
  id: string;
  organizationId: string;
  polarCustomerId: string;
  polarProductId: string;
  polarProductName: string | null;
  status: string;
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
}) => {
  const now = Date.now();
  try {
    await dbPool.query(
      `INSERT INTO subscription (
        id, organization_id, polar_customer_id, polar_product_id, 
        polar_product_name, status, current_period_start, current_period_end,
        cancel_at_period_end, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
      ON CONFLICT (id) DO UPDATE SET
        status = $6,
        current_period_start = $7,
        current_period_end = $8,
        cancel_at_period_end = $9,
        updated_at = $10`,
      [
        subscriptionData.id,
        subscriptionData.organizationId,
        subscriptionData.polarCustomerId,
        subscriptionData.polarProductId,
        subscriptionData.polarProductName,
        subscriptionData.status,
        subscriptionData.currentPeriodStart,
        subscriptionData.currentPeriodEnd,
        subscriptionData.cancelAtPeriodEnd ?? false,
        now,
      ]
    );
    console.log(`[Polar] Upserted subscription ${subscriptionData.id}`);
  } catch (error) {
    console.error("[Polar] Failed to upsert subscription:", error);
  }
};

// Build Polar plugins array
const polarPlugins = polarClient
  ? [
      polar({
        client: polarClient,
        createCustomerOnSignUp: true,
        use: [
          checkout({
            // Products will be fetched dynamically - users can pass product ID or slug
            products: async () => {
              try {
                const response = await polarClient.products.list({
                  isRecurring: true,
                  isArchived: false,
                });
                return response.result.items.map((product) => ({
                  productId: product.id,
                  // Use product name as slug (lowercase, hyphenated)
                  slug: product.name.toLowerCase().replace(/\s+/g, "-"),
                }));
              } catch (error) {
                console.error("[Polar] Failed to fetch products:", error);
                return [];
              }
            },
            successUrl: `${serverEnv.BETTER_AUTH_URL}/subscription/success?checkout_id={CHECKOUT_ID}`,
            authenticatedUsersOnly: true,
          }),
          portal({
            returnUrl: serverEnv.BETTER_AUTH_URL,
          }),
          ...(serverEnv.POLAR_WEBHOOK_SECRET
            ? [
                webhooks({
                  secret: serverEnv.POLAR_WEBHOOK_SECRET,
                  onSubscriptionCreated: async (payload) => {
                    console.log(
                      "[Polar Webhook] Subscription created:",
                      payload.data.id
                    );
                    const sub = payload.data;
                    // The referenceId should be the organization ID (passed during checkout)
                    const orgId = sub.metadata?.referenceId as
                      | string
                      | undefined;
                    if (!orgId) {
                      console.warn(
                        "[Polar] No referenceId in subscription metadata"
                      );
                      return;
                    }

                    const productName = sub.product?.name ?? null;
                    const tier = mapProductToTier(productName);

                    await upsertSubscription({
                      id: sub.id,
                      organizationId: orgId,
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

                    await updateOrgSubscription(orgId, {
                      subscriptionId: sub.id,
                      tier,
                      status: sub.status,
                    });
                  },
                  onSubscriptionUpdated: async (payload) => {
                    console.log(
                      "[Polar Webhook] Subscription updated:",
                      payload.data.id
                    );
                    const sub = payload.data;
                    const orgId = sub.metadata?.referenceId as
                      | string
                      | undefined;
                    if (!orgId) {
                      return;
                    }

                    const productName = sub.product?.name ?? null;
                    const tier = mapProductToTier(productName);

                    await upsertSubscription({
                      id: sub.id,
                      organizationId: orgId,
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

                    await updateOrgSubscription(orgId, {
                      subscriptionId: sub.id,
                      tier,
                      status: sub.status,
                    });
                  },
                  onSubscriptionActive: async (payload) => {
                    console.log(
                      "[Polar Webhook] Subscription active:",
                      payload.data.id
                    );
                    const sub = payload.data;
                    const orgId = sub.metadata?.referenceId as
                      | string
                      | undefined;
                    if (!orgId) {
                      return;
                    }

                    const productName = sub.product?.name ?? null;
                    const tier = mapProductToTier(productName);

                    await updateOrgSubscription(orgId, {
                      subscriptionId: sub.id,
                      tier,
                      status: "active",
                    });
                  },
                  onSubscriptionCanceled: async (payload) => {
                    console.log(
                      "[Polar Webhook] Subscription canceled:",
                      payload.data.id
                    );
                    const sub = payload.data;
                    const orgId = sub.metadata?.referenceId as
                      | string
                      | undefined;
                    if (!orgId) {
                      return;
                    }

                    // On cancellation, set status to canceled but keep the tier
                    // (they still have access until period end)
                    await updateOrgSubscription(orgId, {
                      subscriptionId: sub.id,
                      tier: mapProductToTier(sub.product?.name ?? null),
                      status: "canceled",
                    });
                  },
                  onSubscriptionRevoked: async (payload) => {
                    console.log(
                      "[Polar Webhook] Subscription revoked:",
                      payload.data.id
                    );
                    const sub = payload.data;
                    const orgId = sub.metadata?.referenceId as
                      | string
                      | undefined;
                    if (!orgId) {
                      return;
                    }

                    // On revocation, downgrade to free
                    await updateOrgSubscription(orgId, {
                      subscriptionId: sub.id,
                      tier: "free",
                      status: "none",
                    });
                  },
                }),
              ]
            : []),
        ],
      }),
    ]
  : [];

export const auth = betterAuth({
  database: dbPool,
  baseURL: serverEnv.BETTER_AUTH_URL,
  trustedOrigins: [serverEnv.BETTER_AUTH_URL],
  plugins: [organization(), ...polarPlugins],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: isProduction,
    },
    useSecureCookies: isProduction,
  },
  logger: {
    level: "debug", // Always debug to see errors in production logs
  },
});
