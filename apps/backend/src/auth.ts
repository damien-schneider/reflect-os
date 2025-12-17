import {
  createAuthConfigFromEnv,
  createEmailHandlers,
  generateUniqueSlug,
} from "@repo/auth";
import {
  createPolarClient,
  createPolarConfigFromEnv,
  createPolarPlugins,
  PLAN_LIMITS,
  updateOrgSubscription as updateOrgSubscriptionHelper,
  upsertSubscription as upsertSubscriptionHelper,
} from "@repo/polar";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { Pool } from "pg";
import { env } from "./env";

// Re-export for backwards compatibility with routes that import from auth.ts
export { mapProductToTier } from "@repo/polar";

// =============================================================================
// CONFIGURATION
// =============================================================================

// Create configurations from environment
const authConfig = createAuthConfigFromEnv(env);
const polarConfig = createPolarConfigFromEnv(env);

const { isProduction, features } = authConfig;

console.log("Better Auth initialized with:", {
  baseURL: authConfig.baseUrl,
  isProduction,
  emailEnabled: features.emailEnabled,
  requireEmailVerification: features.requireEmailVerification,
  polarEnabled: polarConfig.enabled,
  databaseConnected: !!authConfig.databaseUrl,
});

// =============================================================================
// DATABASE & CLIENTS
// =============================================================================

// Database pool for direct queries (used in webhook handlers)
export const dbPool = new Pool({
  connectionString: authConfig.databaseUrl,
});

// Initialize Polar client (only if access token is configured)
export const polarClient = createPolarClient(polarConfig);

// =============================================================================
// EXPORTED HELPERS (for backwards compatibility)
// =============================================================================

// Wrapper to pass pool automatically
export const updateOrgSubscription = async (
  organizationId: string,
  subscriptionData: {
    subscriptionId: string;
    tier: string;
    status: string;
  }
) => updateOrgSubscriptionHelper(dbPool, organizationId, subscriptionData);

// Wrapper to pass pool automatically
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
}) => upsertSubscriptionHelper(dbPool, subscriptionData);

// =============================================================================
// POLAR PLUGINS
// =============================================================================

// Build Polar plugins array using the package
const polarPlugins = createPolarPlugins(
  polarClient
    ? { client: polarClient, config: polarConfig, pool: dbPool }
    : null
);

// =============================================================================
// TRUSTED ORIGINS
// =============================================================================

// Regex for removing trailing slashes
const trailingSlashRegex = /\/$/;

// Build trusted origins list (includes URL variations)
const getTrustedOrigins = (): string[] => {
  const origins: string[] = [];

  if (authConfig.baseUrl) {
    origins.push(authConfig.baseUrl);
    // Also allow without trailing slash
    origins.push(authConfig.baseUrl.replace(trailingSlashRegex, ""));
  }

  // In development, allow localhost
  if (!isProduction) {
    origins.push("http://localhost:5173", "http://localhost:3000");
  }

  return [...new Set(origins)];
};

// =============================================================================
// ORGANIZATION PLUGIN
// =============================================================================

// Create email handlers from package
const emailHandlers = createEmailHandlers(authConfig);

// =============================================================================
// BETTER AUTH INSTANCE
// =============================================================================

export const auth = betterAuth({
  database: dbPool,
  baseURL: authConfig.baseUrl,
  basePath: "/api/auth", // Must match the route mount path in routes/index.ts
  trustedOrigins: getTrustedOrigins(),
  plugins: [
    organization({
      organizationHooks: {
        // Validate member limit before creating an invitation
        beforeCreateInvitation: async ({ invitation, organization: org }) => {
          const { pool } = { pool: dbPool };
          const orgResult = await pool.query<{
            subscription_tier: string | null;
          }>("SELECT subscription_tier FROM organization WHERE id = $1", [
            org.id,
          ]);

          if (orgResult.rows.length === 0) {
            throw new Error("Organization not found");
          }

          // TODO: Re-enable team tier when ready
          const tier = (orgResult.rows[0].subscription_tier ?? "free") as
            | "free"
            | "pro";
          const limits = PLAN_LIMITS[tier] ?? PLAN_LIMITS.free;

          const memberResult = await pool.query<{ count: string }>(
            "SELECT COUNT(*) as count FROM member WHERE organization_id = $1",
            [org.id]
          );
          const memberCount = Number.parseInt(memberResult.rows[0].count, 10);

          const pendingResult = await pool.query<{ count: string }>(
            "SELECT COUNT(*) as count FROM invitation WHERE organization_id = $1 AND status = 'pending'",
            [org.id]
          );
          const pendingCount = Number.parseInt(pendingResult.rows[0].count, 10);
          const totalPotentialMembers = memberCount + pendingCount;

          if (totalPotentialMembers >= limits.membersPerOrg) {
            throw new Error(
              `Member limit reached. Your ${tier} plan allows up to ${limits.membersPerOrg} members. ` +
                `You currently have ${memberCount} members and ${pendingCount} pending invitations. ` +
                "Please upgrade your subscription to add more members."
            );
          }

          console.log(
            `[Auth] Invitation allowed for org ${org.id}: ` +
              `${memberCount} members + ${pendingCount} pending / ${limits.membersPerOrg} max`
          );

          return { data: invitation };
        },

        // Validate member limit before accepting an invitation
        beforeAcceptInvitation: async ({ organization: org }) => {
          const { pool } = { pool: dbPool };
          const orgResult = await pool.query<{
            subscription_tier: string | null;
          }>("SELECT subscription_tier FROM organization WHERE id = $1", [
            org.id,
          ]);

          if (orgResult.rows.length === 0) {
            throw new Error("Organization not found");
          }

          // TODO: Re-enable team tier when ready
          const tier = (orgResult.rows[0].subscription_tier ?? "free") as
            | "free"
            | "pro";
          const limits = PLAN_LIMITS[tier] ?? PLAN_LIMITS.free;

          const memberResult = await pool.query<{ count: string }>(
            "SELECT COUNT(*) as count FROM member WHERE organization_id = $1",
            [org.id]
          );
          const memberCount = Number.parseInt(memberResult.rows[0].count, 10);

          if (memberCount >= limits.membersPerOrg) {
            throw new Error(
              `This organization has reached its member limit of ${limits.membersPerOrg} on the ${tier} plan. ` +
                "The organization owner needs to upgrade the subscription to add more members."
            );
          }

          console.log(
            `[Auth] Invitation acceptance allowed for org ${org.id}: ` +
              `${memberCount} members / ${limits.membersPerOrg} max`
          );
        },
      },
      sendInvitationEmail: emailHandlers.sendInvitationEmail,
    }),
    ...polarPlugins,
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: features.requireEmailVerification,
    sendResetPassword: emailHandlers.sendResetPassword,
  },
  emailVerification: {
    sendOnSignUp: features.requireEmailVerification,
    autoSignInAfterVerification: true,
    sendVerificationEmail: emailHandlers.sendVerificationEmail,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Create Polar customer with error handling (non-blocking)
          if (polarClient) {
            try {
              await polarClient.customers.create({
                email: user.email,
                name: user.name ?? user.email,
                metadata: {
                  userId: user.id,
                },
              });
              console.log(`[Auth] Created Polar customer for user ${user.id}`);
            } catch (polarError) {
              // Log full error server-side only - don't expose to client
              console.error(
                `[Auth] Polar customer creation failed for user ${user.id} (server-side only):`,
                polarError
              );
              // Don't throw - signup continues, customer can be created later
            }
          }

          // Automatically create a personal organization for new users
          try {
            const orgName = user.name ? `${user.name}'s Space` : "My Space";
            const orgSlug = generateUniqueSlug(
              user.name || user.email.split("@")[0]
            );

            // Use the internal API to create an organization for the user
            // biome-ignore lint/suspicious/noExplicitAny: Organization plugin adds this method dynamically
            await (auth.api as any).createOrganization({
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
