import { checkout, polar, portal, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import {
  ResetPasswordTemplate,
  sendEmail,
  VerifyEmailTemplate,
} from "@repo/email";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { Pool } from "pg";
import { env } from "./env";

const isProduction = env.NODE_ENV === "production";

console.log("Better Auth initialized with:", {
  baseURL: env.BETTER_AUTH_URL,
  isProduction,
  databaseConnected: !!env.ZERO_UPSTREAM_DB,
});

// Initialize Polar client (only if access token is configured)
export const polarClient = env.POLAR_ACCESS_TOKEN
  ? new Polar({
      accessToken: env.POLAR_ACCESS_TOKEN,
      server: env.POLAR_ENVIRONMENT === "production" ? "production" : "sandbox",
    })
  : null;

// Database pool for direct queries (used in webhook handlers)
export const dbPool = new Pool({
  connectionString: env.ZERO_UPSTREAM_DB,
});

// Helper to map Polar product name to subscription tier
// Products should be named: "{Tier} Monthly" or "{Tier} Yearly"
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
            successUrl: `${env.BETTER_AUTH_URL}/subscription/success?checkout_id={CHECKOUT_ID}`,
            authenticatedUsersOnly: true,
          }),
          portal({
            returnUrl: env.BETTER_AUTH_URL,
          }),
          ...(env.POLAR_WEBHOOK_SECRET
            ? [
                webhooks({
                  secret: env.POLAR_WEBHOOK_SECRET,
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

// Regex for removing trailing slashes
const trailingSlashRegex = /\/$/;

// Build trusted origins list (includes URL variations)
const getTrustedOrigins = (): string[] => {
  const origins: string[] = [];

  if (env.BETTER_AUTH_URL) {
    origins.push(env.BETTER_AUTH_URL);
    // Also allow without trailing slash
    origins.push(env.BETTER_AUTH_URL.replace(trailingSlashRegex, ""));
  }

  // In development, allow localhost
  if (!isProduction) {
    origins.push("http://localhost:5173", "http://localhost:3000");
  }

  return [...new Set(origins)];
};

// Helper to generate a unique slug from a name
const generateUniqueSlug = (name: string): string => {
  const baseSlug = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  // Add a short random suffix to ensure uniqueness
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${suffix}`;
};

export const auth = betterAuth({
  database: dbPool,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: getTrustedOrigins(),
  plugins: [organization(), ...polarPlugins],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    // biome-ignore lint/suspicious/useAwait: intentionally not awaiting to prevent timing attacks
    sendResetPassword: async ({ user, url }) => {
      // Fire and forget to prevent timing attacks - don't await
      sendEmail({
        to: user.email,
        subject: "Reset your password",
        template: ResetPasswordTemplate({
          userName: user.name,
          resetUrl: url,
        }),
        config: {
          apiKey: env.RESEND_API_KEY,
          fromAddress: env.EMAIL_FROM_ADDRESS,
          fromName: env.EMAIL_FROM_NAME,
          isDevelopment: !isProduction,
        },
      }).catch((err: unknown) => {
        console.error("[Auth] Failed to send reset password email:", err);
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      class VerificationEmailError extends Error {
        status?: number;
        code?: string;

        constructor(message: string, status?: number, code?: string) {
          super(message);
          this.name = "VerificationEmailError";
          this.status = status;
          this.code = code;
        }
      }

      // Replace the default callback URL (/) with /dashboard
      const verificationUrl = url.replace(
        "callbackURL=%2F",
        "callbackURL=%2Fdashboard"
      );

      const result = await sendEmail({
        to: user.email,
        subject: "Verify your email address",
        template: VerifyEmailTemplate({
          userName: user.name,
          verificationUrl,
        }),
        config: {
          apiKey: env.RESEND_API_KEY,
          fromAddress: env.EMAIL_FROM_ADDRESS,
          fromName: env.EMAIL_FROM_NAME,
          isDevelopment: !isProduction,
        },
      });

      if (!result.success) {
        console.error(
          "[Auth] Failed to send verification email:",
          result.error
        );
        // Always throw the error so the frontend knows the email wasn't sent
        // Include status/code metadata so clients can present actionable UI
        // The frontend will handle showing appropriate messages
        const statusCode = (result as { statusCode?: number }).statusCode;
        const errorCode = (result as { errorCode?: string }).errorCode;
        throw new VerificationEmailError(
          result.error || "Verification email could not be sent",
          statusCode ?? 502,
          errorCode ?? "VERIFICATION_EMAIL_FAILED"
        );
      }
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Automatically create a personal organization for new users
          try {
            const orgName = user.name ? `${user.name}'s Space` : "My Space";
            const orgSlug = generateUniqueSlug(
              user.name || user.email.split("@")[0]
            );

            // Use the internal API to create an organization for the user
            await auth.api.createOrganization({
              body: {
                name: orgName,
                slug: orgSlug,
                userId: user.id,
              },
            });

            console.log(
              `[Auth] Created personal organization "${orgName}" for user ${user.id}`
            );
          } catch (error) {
            // Log error but don't fail the user creation
            console.error(
              `[Auth] Failed to create personal organization for user ${user.id}:`,
              error
            );
          }
        },
      },
    },
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
