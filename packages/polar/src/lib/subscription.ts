/**
 * Subscription Helpers
 *
 * Database operations for managing subscription records.
 */

import type { Pool } from "pg";
import { mapProductToTier } from "../tiers";

// =============================================================================
// TYPES
// =============================================================================

export interface SubscriptionData {
  id: string;
  organizationId: string;
  polarCustomerId: string;
  polarProductId: string;
  polarProductName: string | null;
  status: string;
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
}

export interface OrgSubscriptionUpdate {
  subscriptionId: string;
  tier: string;
  status: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Update organization subscription in database.
 */
export const updateOrgSubscription = async (
  pool: Pool,
  organizationId: string,
  subscriptionData: OrgSubscriptionUpdate
): Promise<void> => {
  try {
    await pool.query(
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
    throw error;
  }
};

/**
 * Upsert subscription record in database.
 */
export const upsertSubscription = async (
  pool: Pool,
  subscriptionData: SubscriptionData
): Promise<void> => {
  const now = Date.now();
  try {
    await pool.query(
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
    throw error;
  }
};

/**
 * Process a subscription event (created, updated, active).
 * Handles both subscription table and organization updates.
 */
export const processSubscriptionEvent = async (
  pool: Pool,
  subscription: {
    id: string;
    customerId: string;
    productId: string;
    product?: { name?: string | null } | null;
    metadata?: Record<string, unknown>;
    status: string;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
  }
): Promise<{ organizationId: string; tier: string } | null> => {
  const orgId = subscription.metadata?.referenceId as string | undefined;

  if (!orgId) {
    console.warn("[Polar] No referenceId in subscription metadata");
    return null;
  }

  const productName = subscription.product?.name ?? null;
  const tier = mapProductToTier(productName);

  await upsertSubscription(pool, {
    id: subscription.id,
    organizationId: orgId,
    polarCustomerId: subscription.customerId,
    polarProductId: subscription.productId,
    polarProductName: productName,
    status: subscription.status,
    currentPeriodStart: subscription.currentPeriodStart
      ? new Date(subscription.currentPeriodStart).getTime()
      : undefined,
    currentPeriodEnd: subscription.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd).getTime()
      : undefined,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  });

  await updateOrgSubscription(pool, orgId, {
    subscriptionId: subscription.id,
    tier,
    status: subscription.status,
  });

  return { organizationId: orgId, tier };
};
