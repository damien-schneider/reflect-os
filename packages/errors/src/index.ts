/**
 * @repo/errors - Shared error types and utilities
 *
 * This package provides type-safe error handling across the monorepo.
 * All error codes are defined here and can be used by both backend and frontend.
 */

export type {
  AppErrorCodeType,
  AuthErrorCodeType,
  EmailErrorCodeType,
} from "./codes";
// Codes
export {
  AppErrorCode,
  AuthErrorCode,
  EmailErrorCode,
  isAppErrorCode,
  isAuthErrorCode,
  isEmailErrorCode,
} from "./codes";

// Messages
export {
  APP_ERROR_MESSAGES,
  AUTH_ERROR_MESSAGES,
  EMAIL_ERROR_MESSAGES,
  getErrorMessage,
} from "./messages";
export type { AppError, Result } from "./types";
// Types
export { createError, err, ok } from "./types";
