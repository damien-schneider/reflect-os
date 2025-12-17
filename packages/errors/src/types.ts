/**
 * Error type definitions
 *
 * These types define the structure of errors used throughout the application.
 */

import type { AppErrorCodeType } from "./codes";

/**
 * Structured error object with code and message
 */
export type AppError = {
  code: AppErrorCodeType | string;
  message: string;
  originalMessage?: string;
};

/**
 * Result type for operations that can fail
 */
export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create a success result
 */
export function ok<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

/**
 * Create a failure result
 */
export function err<E = AppError>(error: E): { success: false; error: E } {
  return { success: false, error };
}

/**
 * Create an error object with the given code and message
 */
export function createError(
  code: AppErrorCodeType | string,
  message: string,
  originalMessage?: string
): AppError {
  return { code, message, originalMessage };
}
