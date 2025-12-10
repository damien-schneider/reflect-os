import type { ResendErrorCode } from "@repo/email";

type AuthClientError = {
  message?: string;
  status?: number;
  code?: string | ResendErrorCode;
};

/**
 * Generate user-facing sign-up error messages from backend errors.
 * Maps Resend API error codes to actionable UI text.
 *
 * @see https://resend.com/docs/api-reference/errors
 */
export const getSignUpErrorMessage = (error: AuthClientError): string => {
  const message = error.message ?? "";

  // Resend test mode validation error (email not on allowlist)
  if (
    error.code === "validation_error" &&
    message.toLowerCase().includes("testing")
  ) {
    return "We couldn't send the verification email because Resend test mode only allows the authorized test address. Use the permitted test email or verify a domain and update the sender, then try again.";
  }

  if (message) {
    return message;
  }

  return "Could not create account. Please try again.";
};
