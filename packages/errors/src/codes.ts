/**
 * Application error codes organized by domain
 *
 * These codes are used to identify specific error types across the application.
 * They are shared between backend and frontend for type-safe error handling.
 */

/**
 * Email-related error codes
 */
export const EmailErrorCode = {
  /** Missing API key configuration */
  MISSING_API_KEY: "EMAIL_MISSING_API_KEY",
  /** Missing from address configuration */
  MISSING_FROM_ADDRESS: "EMAIL_MISSING_FROM_ADDRESS",
  /** Domain not verified with email provider - can only send to own email in test mode */
  DOMAIN_NOT_VERIFIED: "EMAIL_DOMAIN_NOT_VERIFIED",
  /** Rate limit exceeded */
  RATE_LIMITED: "EMAIL_RATE_LIMITED",
  /** Invalid recipient email address */
  INVALID_RECIPIENT: "EMAIL_INVALID_RECIPIENT",
  /** General validation error from email provider */
  VALIDATION_ERROR: "EMAIL_VALIDATION_ERROR",
  /** Unknown or unexpected email error */
  UNKNOWN: "EMAIL_UNKNOWN",
} as const;

export type EmailErrorCodeType =
  (typeof EmailErrorCode)[keyof typeof EmailErrorCode];

/**
 * Authentication-related error codes
 */
export const AuthErrorCode = {
  /** User already exists with this email */
  USER_EXISTS: "AUTH_USER_EXISTS",
  /** Invalid credentials provided */
  INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  /** Email not verified */
  EMAIL_NOT_VERIFIED: "AUTH_EMAIL_NOT_VERIFIED",
  /** User not found */
  USER_NOT_FOUND: "AUTH_USER_NOT_FOUND",
  /** Session expired or invalid */
  SESSION_INVALID: "AUTH_SESSION_INVALID",
  /** Unknown authentication error */
  UNKNOWN: "AUTH_UNKNOWN",
} as const;

export type AuthErrorCodeType =
  (typeof AuthErrorCode)[keyof typeof AuthErrorCode];

/**
 * All application error codes
 */
export const AppErrorCode = {
  ...EmailErrorCode,
  ...AuthErrorCode,
} as const;

export type AppErrorCodeType = EmailErrorCodeType | AuthErrorCodeType;

/**
 * Check if a string is a valid EmailErrorCode
 */
export function isEmailErrorCode(code: string): code is EmailErrorCodeType {
  return Object.values(EmailErrorCode).includes(code as EmailErrorCodeType);
}

/**
 * Check if a string is a valid AuthErrorCode
 */
export function isAuthErrorCode(code: string): code is AuthErrorCodeType {
  return Object.values(AuthErrorCode).includes(code as AuthErrorCodeType);
}

/**
 * Check if a string is a valid AppErrorCode
 */
export function isAppErrorCode(code: string): code is AppErrorCodeType {
  return isEmailErrorCode(code) || isAuthErrorCode(code);
}
