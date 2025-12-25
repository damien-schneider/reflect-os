/**
 * Polar Webhooks
 *
 * Creates webhook handlers for Polar subscription events.
 */

import { webhooks } from "@polar-sh/better-auth";
import type { Pool } from "pg";
import { mapProductToTier } from "../tiers";
import { updateOrgSubscription, upsertSubscription } from "./subscription";

interface WebhookConfig {
  secret: string;
  pool: Pool;
}

/**
 * Creates Polar webhook handlers for Better Auth.
 */
// biome-ignore lint/suspicious/noExplicitAny: Better Auth webhook types are complex
export const createPolarWebhooks = (config: WebhookConfig): any => {
  const { secret, pool } = config;

  return webhooks({
    secret,

    onSubscriptionCreated: async (payload) => {
      console.log("[Polar Webhook] Subscription created:", payload.data.id);
      const sub = payload.data;
      const orgId = sub.metadata?.referenceId as string | undefined;

      if (!orgId) {
        console.warn("[Polar] No referenceId in subscription metadata");
        return;
      }

      const productName = sub.product?.name ?? null;
      const tier = mapProductToTier(productName);

      await upsertSubscription(pool, {
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

      await updateOrgSubscription(pool, orgId, {
        subscriptionId: sub.id,
        tier,
        status: sub.status,
      });
    },

    onSubscriptionUpdated: async (payload) => {
      console.log("[Polar Webhook] Subscription updated:", payload.data.id);
      const sub = payload.data;
      const orgId = sub.metadata?.referenceId as string | undefined;

      if (!orgId) {
        return;
      }

      const productName = sub.product?.name ?? null;
      const tier = mapProductToTier(productName);

      await upsertSubscription(pool, {
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

      await updateOrgSubscription(pool, orgId, {
        subscriptionId: sub.id,
        tier,
        status: sub.status,
      });
    },

    onSubscriptionActive: async (payload) => {
      console.log("[Polar Webhook] Subscription active:", payload.data.id);
      const sub = payload.data;
      const orgId = sub.metadata?.referenceId as string | undefined;

      if (!orgId) {
        return;
      }

      const productName = sub.product?.name ?? null;
      const tier = mapProductToTier(productName);

      await updateOrgSubscription(pool, orgId, {
        subscriptionId: sub.id,
        tier,
        status: "active",
      });
    },

    onSubscriptionCanceled: async (payload) => {
      console.log("[Polar Webhook] Subscription canceled:", payload.data.id);
      const sub = payload.data;
      const orgId = sub.metadata?.referenceId as string | undefined;

      if (!orgId) {
        return;
      }

      // On cancellation, set status to canceled but keep the tier
      // (they still have access until period end)
      await updateOrgSubscription(pool, orgId, {
        subscriptionId: sub.id,
        tier: mapProductToTier(sub.product?.name ?? null),
        status: "canceled",
      });
    },

    onSubscriptionRevoked: async (payload) => {
      console.log("[Polar Webhook] Subscription revoked:", payload.data.id);
      const sub = payload.data;
      const orgId = sub.metadata?.referenceId as string | undefined;

      if (!orgId) {
        return;
      }

      // On revocation, downgrade to free
      await updateOrgSubscription(pool, orgId, {
        subscriptionId: sub.id,
        tier: "free",
        status: "none",
      });
    },
  });
};
