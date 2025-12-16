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
import { PLAN_LIMITS, type SubscriptionTier } from "./tiers.config";

const isProduction = env.NODE_ENV === "production";
const allowDevUnverifiedSignup =
  !isProduction && env.DEV_AUTH_ALLOW_UNVERIFIED_SIGNUP === "true";

// Email is enabled only if RESEND_API_KEY is configured
const isEmailEnabled = !!env.RESEND_API_KEY;

// If email is not enabled, we should skip email verification
const skipEmailVerification = !isEmailEnabled || allowDevUnverifiedSignup;

// Regex to match default callback URL (/) at end of query string
// Used to replace default "/" with "/dashboard" in verification URLs
const DEFAULT_CALLBACK_URL_REGEX = /callbackURL=%2F(&|$)/;

console.log("Better Auth initialized with:", {
  baseURL: env.BETTER_AUTH_URL,
  isProduction,
  allowDevUnverifiedSignup,
  isEmailEnabled,
  skipEmailVerification,
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

/**
 * Get organization subscription tier and member count.
 * Used for enforcing member limits on invitations.
 */
const getOrgMemberLimitInfo = async (
  organizationId: string
): Promise<{
  tier: SubscriptionTier;
  memberCount: number;
  maxMembers: number;
}> => {
  // Get organization tier
  const orgResult = await dbPool.query<{ subscription_tier: string | null }>(
    "SELECT subscription_tier FROM organization WHERE id = $1",
    [organizationId]
  );

  if (orgResult.rows.length === 0) {
    throw new Error("Organization not found");
  }

  const tier = (orgResult.rows[0].subscription_tier ??
    "free") as SubscriptionTier;
  const limits = PLAN_LIMITS[tier] ?? PLAN_LIMITS.free;

  // Get member count
  const memberResult = await dbPool.query<{ count: string }>(
    "SELECT COUNT(*) as count FROM member WHERE organization_id = $1",
    [organizationId]
  );

  const memberCount = Number.parseInt(memberResult.rows[0].count, 10);

  return {
    tier,
    memberCount,
    maxMembers: limits.membersPerOrg,
  };
};

// Build organization plugin with optional invitation email support
const organizationPluginConfig: Parameters<typeof organization>[0] = {
  // Organization hooks for enforcing subscription-based member limits
  organizationHooks: {
    // Validate member limit before creating an invitation
    beforeCreateInvitation: async ({ invitation, organization: org }) => {
      const { tier, memberCount, maxMembers } = await getOrgMemberLimitInfo(
        org.id
      );

      // Count pending invitations too
      const pendingResult = await dbPool.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM invitation WHERE organization_id = $1 AND status = 'pending'",
        [org.id]
      );
      const pendingCount = Number.parseInt(pendingResult.rows[0].count, 10);
      const totalPotentialMembers = memberCount + pendingCount;

      if (totalPotentialMembers >= maxMembers) {
        throw new Error(
          `Member limit reached. Your ${tier} plan allows up to ${maxMembers} members. ` +
            `You currently have ${memberCount} members and ${pendingCount} pending invitations. ` +
            "Please upgrade your subscription to add more members."
        );
      }

      console.log(
        `[Auth] Invitation allowed for org ${org.id}: ` +
          `${memberCount} members + ${pendingCount} pending / ${maxMembers} max`
      );

      return { data: invitation };
    },

    // Validate member limit before accepting an invitation
    beforeAcceptInvitation: async ({
      invitation: _invitation,
      user: _user,
      organization: org,
    }) => {
      const { tier, memberCount, maxMembers } = await getOrgMemberLimitInfo(
        org.id
      );

      if (memberCount >= maxMembers) {
        throw new Error(
          `This organization has reached its member limit of ${maxMembers} on the ${tier} plan. ` +
            "The organization owner needs to upgrade the subscription to add more members."
        );
      }

      console.log(
        `[Auth] Invitation acceptance allowed for org ${org.id}: ` +
          `${memberCount} members / ${maxMembers} max`
      );
    },
  },
};

// Only configure invitation emails if email is enabled
if (isEmailEnabled) {
  // biome-ignore lint/suspicious/useAwait: better-auth expects async function signature
  organizationPluginConfig.sendInvitationEmail = async (data) => {
    const inviteLink = `${env.BETTER_AUTH_URL}/accept-invitation/${data.id}`;
    // For now, just log the invitation - you can add a proper invitation template later
    console.log(
      `[Auth] Invitation email to ${data.email} from ${data.inviter.user.email} for org ${data.organization.name}`
    );
    console.log(`[Auth] Invitation link: ${inviteLink}`);
    // TODO: Create and send an InvitationTemplate when needed
  };
} else {
  // When email is disabled, log invitations but don't try to send
  // biome-ignore lint/suspicious/useAwait: better-auth expects async function signature
  organizationPluginConfig.sendInvitationEmail = async (data) => {
    const inviteLink = `${env.BETTER_AUTH_URL}/accept-invitation/${data.id}`;
    console.log(
      `[Auth] Email disabled - Invitation for ${data.email} to join ${data.organization.name}`
    );
    console.log(`[Auth] Invitation link: ${inviteLink}`);
  };
}

export const auth = betterAuth({
  database: dbPool,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: getTrustedOrigins(),
  plugins: [organization(organizationPluginConfig), ...polarPlugins],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: !skipEmailVerification,
    // biome-ignore lint/suspicious/useAwait: intentionally not awaiting to prevent timing attacks
    sendResetPassword: async ({ user, url }) => {
      if (!isEmailEnabled) {
        console.log(
          `[Auth] Email disabled - Reset password URL for ${user.email}: ${url}`
        );
        return;
      }
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
    sendOnSignUp: !skipEmailVerification,
    autoSignInAfterVerification: true,
    // biome-ignore lint/suspicious/useAwait: intentionally fire-and-forget to not block signup
    sendVerificationEmail: async ({ user, url }) => {
      if (!isEmailEnabled) {
        console.log(
          `[Auth] Email disabled - Verification URL for ${user.email}: ${url}`
        );
        return;
      }
      // Replace the default callback URL (/) with /dashboard
      // Use regex with end anchor to avoid partial matches like %2Fdashboard -> %2Fdashboarddashboard
      const verificationUrl = url.replace(
        DEFAULT_CALLBACK_URL_REGEX,
        "callbackURL=%2Fdashboard$1"
      );

      // Fire-and-forget: Don't block signup if email fails
      // The user can request a new verification email from the check-email page
      // This prevents signup from appearing to fail when only the email fails
      // (the account IS created successfully even if email sending fails)
      sendEmail({
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
      })
        .then((result) => {
          if (result.success) {
            console.log(`[Auth] Verification email sent to ${user.email}`);
          } else {
            console.error(
              "[Auth] Failed to send verification email:",
              result.error
            );
          }
        })
        .catch((err: unknown) => {
          console.error("[Auth] Error sending verification email:", err);
        });
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
