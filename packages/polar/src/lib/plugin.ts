/**
 * Polar Better Auth Plugin
 *
 * Creates the Polar plugin configuration for Better Auth.
 */

import { checkout, polar, portal } from "@polar-sh/better-auth";
import type { Polar } from "@polar-sh/sdk";
import type { Pool } from "pg";
import type { PolarConfig } from "./config";
import { createPolarWebhooks } from "./webhooks";

interface PolarPluginConfig {
  client: Polar;
  config: PolarConfig;
  pool: Pool;
}

/**
 * Creates the Polar plugins array for Better Auth.
 * Returns empty array if Polar is not enabled.
 */
export const createPolarPlugins = (
  pluginConfig: PolarPluginConfig | null
  // biome-ignore lint/suspicious/noExplicitAny: Better Auth plugin types are complex
): any[] => {
  if (!pluginConfig) {
    return [];
  }

  const { client, config, pool } = pluginConfig;

  return [
    polar({
      client,
      // Disable automatic customer creation - we handle it in auth.ts databaseHooks
      // with proper error handling that logs server-side only
      createCustomerOnSignUp: false,
      use: [
        checkout({
          // Products will be fetched dynamically - users can pass product ID or slug
          products: async () => {
            try {
              const response = await client.products.list({
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
          successUrl: `${config.baseUrl}/subscription/success?checkout_id={CHECKOUT_ID}`,
          authenticatedUsersOnly: true,
        }),
        portal({
          returnUrl: config.baseUrl,
        }),
        // Only add webhooks if secret is configured
        ...(config.webhookSecret
          ? [
              createPolarWebhooks({
                secret: config.webhookSecret,
                pool,
              }),
            ]
          : []),
      ],
    }),
  ];
};
