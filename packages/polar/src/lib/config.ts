/**
 * Polar Configuration
 *
 * This file contains the configuration for Polar subscription integration.
 * Set `enabled: false` to disable subscriptions/paywalls entirely.
 */

export interface PolarConfig {
  /**
   * Enable or disable subscription features.
   * When disabled, all paywall/subscription features are skipped.
   */
  enabled: boolean;

  /**
   * Polar access token from environment.
   * Required when enabled is true.
   */
  accessToken?: string;

  /**
   * Polar environment (sandbox or production).
   * Defaults to 'sandbox' for development.
   */
  environment: "sandbox" | "production";

  /**
   * Polar webhook secret for verifying webhook signatures.
   * Required for webhook functionality.
   */
  webhookSecret?: string;

  /**
   * Base URL for success/return URLs.
   * Usually your app's public URL.
   */
  baseUrl?: string;
}

/**
 * Default Polar configuration.
 * Override in your app to customize.
 */
export const defaultPolarConfig: PolarConfig = {
  enabled: false,
  environment: "sandbox",
};

/**
 * Validates Polar configuration.
 * Throws descriptive errors if configuration is invalid.
 */
export const validatePolarConfig = (
  config: PolarConfig
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (config.enabled) {
    if (!config.accessToken) {
      errors.push(
        "POLAR_ACCESS_TOKEN is required when Polar is enabled. " +
          "Get your access token from https://polar.sh/settings/tokens"
      );
    }

    if (!config.baseUrl) {
      errors.push(
        "baseUrl is required when Polar is enabled. " +
          "This should be your app's public URL (e.g., https://yourapp.com)"
      );
    }

    if (!config.webhookSecret) {
      // Warning only - webhooks are optional but recommended
      console.warn(
        "[Polar] POLAR_WEBHOOK_SECRET not set. Webhook handlers will be disabled."
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Creates Polar configuration from environment variables.
 * This is the recommended way to configure Polar.
 */
export const createPolarConfigFromEnv = (env: {
  POLAR_ACCESS_TOKEN?: string;
  POLAR_ENVIRONMENT?: string;
  POLAR_WEBHOOK_SECRET?: string;
  BETTER_AUTH_URL?: string;
}): PolarConfig => {
  const hasAccessToken = !!env.POLAR_ACCESS_TOKEN;

  return {
    // Auto-enable if access token is provided
    enabled: hasAccessToken,
    accessToken: env.POLAR_ACCESS_TOKEN,
    environment:
      env.POLAR_ENVIRONMENT === "production" ? "production" : "sandbox",
    webhookSecret: env.POLAR_WEBHOOK_SECRET,
    baseUrl: env.BETTER_AUTH_URL,
  };
};

/**
 * Build-time validation for Polar config.
 * Call this at build time to fail fast if config is invalid.
 */
export const assertPolarConfig = (config: PolarConfig): void => {
  const { valid, errors } = validatePolarConfig(config);

  if (!valid) {
    const errorMessage =
      "Polar configuration is invalid:\n" +
      errors.map((e) => `  - ${e}`).join("\n") +
      "\n\nTo disable Polar, set enabled: false in your config.";

    throw new Error(errorMessage);
  }
};
