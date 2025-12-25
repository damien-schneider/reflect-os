/**
 * Zero Context Type & Authorization Helpers
 *
 * Defines the context type passed through Zero for auth-aware queries and mutations.
 * This follows the official Zero 0.25 pattern from ztunes/zslack examples.
 */

export type ZeroContext =
  | {
      userID: string;
    }
  | undefined;

// Register the context type with Zero's DefaultTypes
// This enables proper type inference in queries and mutators
declare module "@rocicorp/zero" {
  interface DefaultTypes {
    context: ZeroContext;
  }
}

// ============================================
// AUTHORIZATION HELPERS
// ============================================

/**
 * Type guard that asserts the user is logged in.
 * Throws an error if the context is undefined or missing userID.
 *
 * Usage in mutators/queries:
 * ```ts
 * async ({ tx, args, ctx }) => {
 *   isLoggedIn(ctx); // Now ctx is narrowed to { userID: string }
 *   // ctx.userID is guaranteed to exist
 * }
 * ```
 */
export function isLoggedIn(
  ctx: ZeroContext
): asserts ctx is { userID: string } {
  if (!ctx?.userID) {
    throw new Error("Authentication required: User is not logged in");
  }
}

/**
 * Type guard that checks if user is logged in without throwing.
 * Returns the userID if authenticated, undefined otherwise.
 *
 * Useful for queries that should return empty results for anonymous users.
 */
export function getAuthenticatedUserID(ctx: ZeroContext): string | undefined {
  return ctx?.userID;
}
