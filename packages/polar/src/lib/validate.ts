/**
 * Polar Build-Time Validation
 *
 * This module provides build-time validation to ensure that:
 * 1. Polar configuration is valid
 * 2. Polar products exist and match the configured tiers
 *
 * Run this at build time to fail fast if there's a configuration mismatch.
 */

import { Polar } from "@polar-sh/sdk";
import { PAID_TIERS, PLAN_TIERS, type SubscriptionTier } from "../tiers";
import type { PolarConfig } from "./config";

/**
 * Expected product naming convention:
 * - "{TierLabel} Monthly" (e.g., "Pro Monthly")
 * - "{TierLabel} Yearly" (e.g., "Pro Yearly")
 */
const BILLING_INTERVALS = ["Monthly", "Yearly"] as const;

type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    configuredTiers: string[];
    foundProducts: string[];
    missingProducts: string[];
    unmappedProducts: string[];
  };
};

/**
 * Get expected product names for all paid tiers.
 */
const getExpectedProductNames = (): string[] => {
  const expected: string[] = [];

  for (const tier of PAID_TIERS) {
    const tierConfig = PLAN_TIERS[tier];
    for (const interval of BILLING_INTERVALS) {
      expected.push(`${tierConfig.label} ${interval}`);
    }
  }

  return expected;
};

/**
 * Extract tier from product name.
 * Returns null if product doesn't match expected naming.
 */
const extractTierFromProductName = (
  productName: string
): SubscriptionTier | null => {
  const name = productName.toLowerCase();

  // Check paid tiers first
  for (const tier of PAID_TIERS) {
    const tierLabel = PLAN_TIERS[tier].label.toLowerCase();
    if (name.includes(tierLabel)) {
      return tier;
    }
  }

  return null;
};

/**
 * Validates Polar products against configured tiers.
 * Call this at build time to ensure configuration matches Polar.
 *
 * @param config - Polar configuration (must have valid access token)
 * @returns Validation result with errors and warnings
 */
export const validatePolarProducts = async (
  config: PolarConfig
): Promise<ValidationResult> => {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    details: {
      configuredTiers: PAID_TIERS.map((t) => PLAN_TIERS[t].label),
      foundProducts: [],
      missingProducts: [],
      unmappedProducts: [],
    },
  };

  // Skip validation if Polar is disabled
  if (!config.enabled) {
    result.warnings.push(
      "Polar is disabled. Skipping product validation. " +
        "Set POLAR_ACCESS_TOKEN to enable subscription features."
    );
    return result;
  }

  // Validate access token
  if (!config.accessToken) {
    result.valid = false;
    result.errors.push(
      "POLAR_ACCESS_TOKEN is required for product validation. " +
        "Get your access token from https://polar.sh/settings/tokens"
    );
    return result;
  }

  // Create Polar client
  const polar = new Polar({
    accessToken: config.accessToken,
    server: config.environment === "production" ? "production" : "sandbox",
  });

  try {
    // Fetch products from Polar
    const products = await polar.products.list({});

    const productNames = products.result.items.map((p) => p.name);
    result.details.foundProducts = productNames;

    // Get expected products
    const expectedProducts = getExpectedProductNames();

    // Check for missing products
    for (const expected of expectedProducts) {
      const found = productNames.some(
        (name) => name.toLowerCase() === expected.toLowerCase()
      );

      if (!found) {
        result.details.missingProducts.push(expected);
      }
    }

    // Check for unmapped products (products that don't match any tier)
    for (const productName of productNames) {
      const tier = extractTierFromProductName(productName);
      if (tier === null) {
        result.details.unmappedProducts.push(productName);
      }
    }

    // Generate errors/warnings
    if (result.details.missingProducts.length > 0) {
      result.valid = false;
      result.errors.push(
        "Missing Polar products for configured tiers:\n" +
          result.details.missingProducts.map((p) => `  - ${p}`).join("\n") +
          `\n\nCreate these products in Polar (${config.environment}):\n` +
          "https://polar.sh/dashboard"
      );
    }

    if (result.details.unmappedProducts.length > 0) {
      result.warnings.push(
        `Found Polar products that don't match any configured tier:\n` +
          result.details.unmappedProducts.map((p) => `  - ${p}`).join("\n") +
          `\n\nThese products will be ignored. Expected naming: "{Tier} Monthly" or "{Tier} Yearly"`
      );
    }

    // Verify we can map at least one product to each paid tier
    const tiersWithProducts = new Set<SubscriptionTier>();
    for (const productName of productNames) {
      const tier = extractTierFromProductName(productName);
      if (tier) {
        tiersWithProducts.add(tier);
      }
    }

    for (const tier of PAID_TIERS) {
      if (!tiersWithProducts.has(tier)) {
        result.valid = false;
        const tierLabel = PLAN_TIERS[tier].label;
        result.errors.push(
          `No Polar product found for tier "${tierLabel}". ` +
            `Create products named "${tierLabel} Monthly" and "${tierLabel} Yearly" in Polar.`
        );
      }
    }
  } catch (error) {
    result.valid = false;
    result.errors.push(
      `Failed to fetch Polar products: ${error instanceof Error ? error.message : String(error)}` +
        "\n\nCheck your POLAR_ACCESS_TOKEN and network connectivity." +
        `\nEnvironment: ${config.environment}`
    );
  }

  return result;
};

/**
 * Build-time assertion for Polar products.
 * Throws an error if validation fails (blocking build).
 *
 * @param config - Polar configuration
 * @throws Error if validation fails
 */
export const assertPolarProducts = async (
  config: PolarConfig
): Promise<void> => {
  const result = await validatePolarProducts(config);

  // Print warnings
  for (const warning of result.warnings) {
    console.warn(`[Polar Warning] ${warning}`);
  }

  // Throw on errors
  if (!result.valid) {
    const errorMessage =
      "\n╔═══════════════════════════════════════════════════════════════════════════╗\n" +
      "║                     POLAR VALIDATION FAILED                               ║\n" +
      "╚═══════════════════════════════════════════════════════════════════════════╝\n\n" +
      `Errors:\n${result.errors.map((e) => `  ❌ ${e}`).join("\n\n")}\n\n` +
      `Configured tiers: ${result.details.configuredTiers.join(", ")}\n` +
      `Found products: ${result.details.foundProducts.length > 0 ? result.details.foundProducts.join(", ") : "(none)"}\n\n` +
      "To fix:\n" +
      "  1. Create the missing products in Polar Dashboard\n" +
      "  2. Or disable Polar by removing POLAR_ACCESS_TOKEN from environment\n";

    throw new Error(errorMessage);
  }

  console.log("[Polar] ✓ Validation passed");
  console.log(`[Polar]   Tiers: ${result.details.configuredTiers.join(", ")}`);
  console.log(`[Polar]   Products: ${result.details.foundProducts.join(", ")}`);
};
