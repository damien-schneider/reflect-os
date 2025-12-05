import { useEffect, useState } from "react";
import { parseTierFromProductName } from "../tier.utils";
import {
  type BillingInterval,
  PLAN_TIERS,
  type SubscriptionTier,
} from "../tiers.config";

/**
 * Price information from Polar
 */
export type PolarPrice = {
  id: string;
  amount: number | null;
  currency: string;
  type: string;
};

/**
 * Benefit/feature from Polar's Automated Benefits
 */
export type PolarBenefit = {
  id: string;
  type: string;
  description: string;
};

/**
 * Product from Polar with tier derived from product name.
 * Products should be named: "{Tier} Monthly" or "{Tier} Yearly"
 */
export type PolarProduct = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  isRecurring: boolean;
  recurringInterval: BillingInterval;
  prices: PolarPrice[];
  benefits: PolarBenefit[];
  tier: Exclude<SubscriptionTier, "free">;
};

/**
 * Products grouped by tier and billing interval.
 * Only paid tiers (pro, team) have products.
 */
export type ProductsByTier = Partial<
  Record<
    Exclude<SubscriptionTier, "free">,
    Partial<Record<BillingInterval, PolarProduct>>
  >
>;

type RawProduct = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  isRecurring: boolean;
  recurringInterval: "month" | "year" | null;
  prices: PolarPrice[];
  benefits: PolarBenefit[];
};

/**
 * Hook to fetch products from Polar and group them by tier.
 * Tier is parsed from product name (e.g., "Pro Monthly" -> tier: "pro").
 */
export function useProducts() {
  const [products, setProducts] = useState<PolarProduct[]>([]);
  const [productsByTier, setProductsByTier] = useState<ProductsByTier>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/products");
        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }
        const data = await response.json();
        const rawProducts: RawProduct[] = data.products ?? [];

        // Parse products and extract tier from name
        const parsedProducts: PolarProduct[] = [];
        const warnings: string[] = [];

        for (const product of rawProducts) {
          const tier = parseTierFromProductName(product.name);

          if (!tier) {
            warnings.push(
              `Product "${product.name}" doesn't match any tier. Expected format: "${PLAN_TIERS.pro.label} Monthly", "${PLAN_TIERS.team.label} Yearly", etc.`
            );
            continue;
          }

          if (!product.recurringInterval) {
            warnings.push(
              `Product "${product.name}" has no recurring interval set in Polar.`
            );
            continue;
          }

          parsedProducts.push({
            id: product.id,
            name: product.name,
            description: product.description,
            slug: product.slug,
            isRecurring: product.isRecurring,
            recurringInterval: product.recurringInterval,
            prices: product.prices,
            benefits: product.benefits,
            tier,
          });
        }

        // Log warnings in development
        if (warnings.length > 0) {
          console.warn("[useProducts] Product parsing warnings:", warnings);
        }

        setProducts(parsedProducts);

        // Group products by tier and interval
        const grouped: ProductsByTier = {};
        for (const product of parsedProducts) {
          if (!grouped[product.tier]) {
            grouped[product.tier] = {};
          }
          const tierGroup = grouped[product.tier];
          if (tierGroup) {
            tierGroup[product.recurringInterval] = product;
          }
        }
        setProductsByTier(grouped);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return { products, productsByTier, isLoading, error };
}

/**
 * Get the price from a product in cents
 */
export function getProductPrice(product: PolarProduct): number | null {
  const price = product.prices[0];
  if (!price?.amount) {
    return null;
  }
  return price.amount;
}

/**
 * Get the currency code for a product (e.g., "USD", "EUR")
 */
export function getProductCurrency(product: PolarProduct): string {
  return (product.prices[0]?.currency ?? "usd").toUpperCase();
}

/**
 * Calculate yearly savings percentage compared to monthly
 */
export function calculateYearlySavings(
  monthlyProduct: PolarProduct | undefined,
  yearlyProduct: PolarProduct | undefined
): number | null {
  const monthlyPrice = monthlyProduct ? getProductPrice(monthlyProduct) : null;
  const yearlyPrice = yearlyProduct ? getProductPrice(yearlyProduct) : null;

  if (!(monthlyPrice && yearlyPrice)) {
    return null;
  }

  const yearlyMonthlyEquivalent = monthlyPrice * 12;
  const savings = Math.round(
    ((yearlyMonthlyEquivalent - yearlyPrice) / yearlyMonthlyEquivalent) * 100
  );
  return savings;
}
