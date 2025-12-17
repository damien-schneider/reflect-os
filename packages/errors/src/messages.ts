/**
 * User-friendly error messages for each error code
 *
 * These messages are safe to display to end users.
 * They should be clear, actionable, and not expose internal details.
 */

import { type AppErrorCodeType, AuthErrorCode, EmailErrorCode } from "./codes";

/**
 * User-friendly messages for email errors
 */
export const EMAIL_ERROR_MESSAGES: Record<string, string> = {
  [EmailErrorCode.MISSING_API_KEY]:
    "Email service is not configured. Please contact support.",
  [EmailErrorCode.MISSING_FROM_ADDRESS]:
    "Email service is not configured. Please contact support.",
  [EmailErrorCode.DOMAIN_NOT_VERIFIED]:
    "Email verification is temporarily unavailable. Please try again later or contact support.",
  [EmailErrorCode.RATE_LIMITED]:
    "Too many requests. Please wait a moment and try again.",
  [EmailErrorCode.INVALID_RECIPIENT]:
    "Please check your email address and try again.",
  [EmailErrorCode.VALIDATION_ERROR]:
    "Could not send verification email. Please try a different email address.",
  [EmailErrorCode.UNKNOWN]: "An unexpected error occurred. Please try again.",
};

/**
 * User-friendly messages for auth errors
 */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  [AuthErrorCode.USER_EXISTS]:
    "An account with this email already exists. Try signing in instead.",
  [AuthErrorCode.INVALID_CREDENTIALS]:
    "Invalid email or password. Please check your credentials.",
  [AuthErrorCode.EMAIL_NOT_VERIFIED]:
    "Please verify your email address before signing in.",
  [AuthErrorCode.USER_NOT_FOUND]:
    "No account found with this email. Try signing up instead.",
  [AuthErrorCode.SESSION_INVALID]:
    "Your session has expired. Please sign in again.",
  [AuthErrorCode.UNKNOWN]: "An unexpected error occurred. Please try again.",
};

/**
 * Combined error messages for all app error codes
 */
export const APP_ERROR_MESSAGES: Record<string, string> = {
  ...EMAIL_ERROR_MESSAGES,
  ...AUTH_ERROR_MESSAGES,
};

/**
 * Get the user-friendly message for an error code
 * Falls back to a generic message if the code is unknown
 */
export function getErrorMessage(code: AppErrorCodeType | string): string {
  return (
    APP_ERROR_MESSAGES[code] ??
    "An unexpected error occurred. Please try again."
  );
}
