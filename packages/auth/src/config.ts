/**
 * Auth Configuration
 *
 * Configuration for Better Auth with feature flags.
 */

export type AuthConfig = {
  /**
   * Base URL for authentication callbacks and redirects.
   * Usually your app's public URL.
   */
  baseUrl: string;

  /**
   * Database connection string.
   */
  databaseUrl: string;

  /**
   * Whether running in production mode.
   */
  isProduction: boolean;

  /**
   * Feature Flags
   */
  features: {
    /**
     * Enable email functionality (verification, password reset).
     * Requires RESEND_API_KEY to be configured.
     */
    emailEnabled: boolean;

    /**
     * Require email verification for new signups.
     * Only applies when emailEnabled is true.
     */
    requireEmailVerification: boolean;

    /**
     * Allow unverified signups in development.
     * Useful for local development without email.
     */
    devAllowUnverifiedSignup: boolean;
  };

  /**
   * Email Configuration (optional)
   */
  email?: {
    apiKey: string;
    fromAddress?: string;
    fromName?: string;
  };
};

/**
 * Creates auth configuration from environment variables.
 */
export const createAuthConfigFromEnv = (env: {
  BETTER_AUTH_URL?: string;
  ZERO_UPSTREAM_DB?: string;
  NODE_ENV?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM_ADDRESS?: string;
  EMAIL_FROM_NAME?: string;
  DEV_AUTH_ALLOW_UNVERIFIED_SIGNUP?: string;
  VITE_PUBLIC_REQUIRE_EMAIL_VERIFICATION?: string;
}): AuthConfig => {
  const isProduction = env.NODE_ENV === "production";
  const emailEnabled = !!env.RESEND_API_KEY;
  const devAllowUnverified =
    !isProduction && env.DEV_AUTH_ALLOW_UNVERIFIED_SIGNUP === "true";

  // Parse email verification requirement
  let requireEmailVerification = false;
  if (emailEnabled && !devAllowUnverified) {
    // If email is enabled and not explicitly bypassed, check the setting
    requireEmailVerification =
      env.VITE_PUBLIC_REQUIRE_EMAIL_VERIFICATION !== "false";
  }

  return {
    baseUrl: env.BETTER_AUTH_URL ?? "http://localhost:3000",
    databaseUrl: env.ZERO_UPSTREAM_DB ?? "",
    isProduction,
    features: {
      emailEnabled,
      requireEmailVerification,
      devAllowUnverifiedSignup: devAllowUnverified,
    },
    email:
      emailEnabled && env.RESEND_API_KEY
        ? {
            apiKey: env.RESEND_API_KEY,
            fromAddress: env.EMAIL_FROM_ADDRESS,
            fromName: env.EMAIL_FROM_NAME,
          }
        : undefined,
  };
};

/**
 * Validates auth configuration.
 */
export const validateAuthConfig = (
  config: AuthConfig
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config.baseUrl) {
    errors.push("BETTER_AUTH_URL is required");
  }

  if (!config.databaseUrl) {
    errors.push("ZERO_UPSTREAM_DB is required");
  }

  if (config.features.emailEnabled && !config.email?.apiKey) {
    errors.push("RESEND_API_KEY is required when email is enabled");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Build-time validation for auth config.
 */
export const assertAuthConfig = (config: AuthConfig): void => {
  const { valid, errors } = validateAuthConfig(config);

  if (!valid) {
    throw new Error(
      "Auth configuration is invalid:\n" +
        errors.map((e) => `  - ${e}`).join("\n")
    );
  }
};
