/**
 * Email Verification URL Utilities
 *
 * Contains helper functions for transforming email verification URLs.
 * Separated from auth.ts for testability (no env dependencies).
 */

// Default callback path for email verification redirects
export const DEFAULT_VERIFICATION_CALLBACK = "/dashboard";

/**
 * Transform verification URL to ensure callbackURL is set correctly.
 * This prevents issues with:
 * - Default "/" callback causing navigation issues
 * - Double paths like "/dashboarddashboard"
 * - Missing callbackURL parameter
 *
 * @param url - The original verification URL from better-auth
 * @param defaultCallback - The default callback path to use (defaults to "/dashboard")
 * @returns Object with transformed URL and any error that occurred
 */
export const transformVerificationUrl = (
  url: string,
  defaultCallback: string = DEFAULT_VERIFICATION_CALLBACK
): { url: string; error?: string; originalCallbackURL?: string | null } => {
  try {
    const parsedUrl = new URL(url);
    const callbackURL = parsedUrl.searchParams.get("callbackURL");

    // Only set to dashboard if it's the default "/" or missing
    // If already set to something else (like "/dashboard"), don't modify
    if (!callbackURL || callbackURL === "/") {
      parsedUrl.searchParams.set("callbackURL", defaultCallback);
      return {
        url: parsedUrl.toString(),
        originalCallbackURL: callbackURL,
      };
    }

    return { url, originalCallbackURL: callbackURL };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown URL parsing error";
    return {
      url, // Return original URL on error
      error: errorMessage,
      originalCallbackURL: null,
    };
  }
};
