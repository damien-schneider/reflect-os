/**
 * Organization Plugin Configuration
 *
 * Helpers for configuring Better Auth's organization plugin
 * with subscription-based member limits.
 */

import { PLAN_LIMITS, type SubscriptionTier } from "@repo/polar";
import type { Pool } from "pg";
import type { AuthConfig } from "./config";

// =============================================================================
// TYPES
// =============================================================================

export interface OrganizationHooksConfig {
  pool: Pool;
  authConfig: AuthConfig;
}

export interface OrgMemberLimitInfo {
  tier: SubscriptionTier;
  memberCount: number;
  maxMembers: number;
}

// =============================================================================
// MEMBER LIMIT HELPERS
// =============================================================================

/**
 * Get organization subscription tier and member count.
 * Used for enforcing member limits on invitations.
 */
export const getOrgMemberLimitInfo = async (
  pool: Pool,
  organizationId: string
): Promise<OrgMemberLimitInfo> => {
  // Get organization tier
  const orgResult = await pool.query<{ subscription_tier: string | null }>(
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
  const memberResult = await pool.query<{ count: string }>(
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

/**
 * Get pending invitation count for an organization.
 */
export const getPendingInvitationCount = async (
  pool: Pool,
  organizationId: string
): Promise<number> => {
  const result = await pool.query<{ count: string }>(
    "SELECT COUNT(*) as count FROM invitation WHERE organization_id = $1 AND status = 'pending'",
    [organizationId]
  );
  return Number.parseInt(result.rows[0].count, 10);
};

// =============================================================================
// ORGANIZATION HOOKS
// =============================================================================

/**
 * Creates organization hooks for Better Auth.
 * Enforces subscription-based member limits.
 */
export const createOrganizationHooks = (config: OrganizationHooksConfig) => {
  const { pool } = config;

  return {
    // Validate member limit before creating an invitation
    beforeCreateInvitation: async ({
      invitation,
      organization: org,
    }: {
      invitation: Record<string, unknown>;
      organization: { id: string; name: string };
    }): Promise<{ data: Record<string, unknown> }> => {
      const { tier, memberCount, maxMembers } = await getOrgMemberLimitInfo(
        pool,
        org.id
      );

      const pendingCount = await getPendingInvitationCount(pool, org.id);
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
    }: {
      invitation: unknown;
      user: unknown;
      organization: { id: string; name: string };
    }): Promise<void> => {
      const { tier, memberCount, maxMembers } = await getOrgMemberLimitInfo(
        pool,
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
  };
};

// =============================================================================
// SLUG GENERATION
// =============================================================================

/**
 * Generate a unique slug from a name.
 */
export const generateUniqueSlug = (name: string): string => {
  const baseSlug = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  // Add a short random suffix to ensure uniqueness
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${suffix}`;
};
