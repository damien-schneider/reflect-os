#!/usr/bin/env node
/**
 * Polar Build Validation Script
 *
 * This script validates Polar configuration at build time.
 * It ensures that:
 * 1. If Polar is enabled, the access token is valid
 * 2. All configured tiers have corresponding Polar products
 *
 * Usage:
 *   bun run scripts/validate-polar.ts
 *
 * Environment variables:
 *   POLAR_ACCESS_TOKEN - Required if Polar is enabled
 *   POLAR_ENVIRONMENT - "sandbox" or "production" (default: sandbox)
 *   POLAR_SKIP_VALIDATION - Set to "true" to skip validation (for CI builds without tokens)
 *
 * Exit codes:
 *   0 - Validation passed or Polar is disabled
 *   1 - Validation failed
 */

// Import from source paths since this runs before build
import {
  assertPolarProducts,
  createPolarConfigFromEnv,
  validatePolarConfig,
} from "../packages/polar/src/index";

const main = async () => {
  console.log("\n🔍 Polar Build Validation\n");

  // Allow skipping validation (useful for CI without tokens)
  if (process.env.POLAR_SKIP_VALIDATION === "true") {
    console.log("⚠️  POLAR_SKIP_VALIDATION is set, skipping validation\n");
    process.exit(0);
  }

  // Create config from environment
  const config = createPolarConfigFromEnv(process.env);

  console.log(`   Environment: ${config.environment}`);
  console.log(`   Enabled: ${config.enabled}`);
  console.log(`   Access Token: ${config.accessToken ? "✓ Set" : "✗ Not set"}`);
  console.log("");

  // First validate the config itself
  const configValidation = validatePolarConfig(config);
  if (!configValidation.valid) {
    console.error("❌ Configuration validation failed:\n");
    for (const error of configValidation.errors) {
      console.error(`   - ${error}`);
    }
    process.exit(1);
  }

  // If disabled, skip product validation
  if (!config.enabled) {
    console.log("ℹ️  Polar is disabled, skipping product validation");
    console.log("   To enable, set POLAR_ACCESS_TOKEN environment variable\n");
    process.exit(0);
  }

  // Validate products against Polar API
  try {
    await assertPolarProducts(config);
    console.log("\n✅ Polar validation passed\n");
    process.exit(0);
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Unknown error occurred"
    );
    process.exit(1);
  }
};

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
