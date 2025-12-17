/**
 * Products Routes
 *
 * Handles fetching subscription products from Polar.
 */

import { Polar } from "@polar-sh/sdk";
import { Hono } from "hono";
import { env } from "../env";

const app = new Hono();

// Initialize Polar client for products endpoint
const polarClient = env.POLAR_ACCESS_TOKEN
  ? new Polar({
      accessToken: env.POLAR_ACCESS_TOKEN,
      server: env.POLAR_ENVIRONMENT === "production" ? "production" : "sandbox",
    })
  : null;

// Fetch available products from Polar
// Products should be named: "{Tier} Monthly" or "{Tier} Yearly"
// e.g., "Pro Monthly", "Pro Yearly"
// NOTE: Team tier is currently disabled
app.get("/", async (c) => {
  if (!polarClient) {
    return c.json({ error: "Polar not configured", products: [] }, 200);
  }

  try {
    const response = await polarClient.products.list({
      isRecurring: true,
      isArchived: false,
    });

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

export default app;
