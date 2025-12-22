/**
 * Zero Mutate Endpoint
 *
 * Handles mutation requests from zero-cache.
 * This endpoint is called by zero-cache to execute mutations on the server.
 *
 * Zero 0.25 Security:
 * - Uses cookie-based auth (cookies forwarded by zero-cache)
 * - Returns 401 for unauthenticated mutation attempts
 * - Returns 403 for unauthorized mutation attempts
 * - Mutators validate ownership and permissions before executing
 *
 * Follows the official ztunes/zslack Zero 0.25 pattern.
 */

import { mustGetMutator } from "@rocicorp/zero";
import { handleMutateRequest } from "@rocicorp/zero/server";
import type { Context } from "hono";
import { Hono } from "hono";
import { mutators } from "../../../../web/src/mutators";
import type { ZeroContext } from "../../../../web/src/zero-context";
import { auth } from "../../auth";
import { dbProvider } from "./db-provider";

const app = new Hono();

// Extract handler to avoid deep type instantiation error in route definition
// biome-ignore lint/suspicious/noExplicitAny: Required to avoid TypeScript deep type instantiation error with complex Zero types
async function handleMutate(c: Context): Promise<any> {
  try {
    // Debug: Log incoming cookies from zero-cache
    const cookieHeader = c.req.header("Cookie");
    console.log(
      "[API /zero/mutate] Incoming cookies:",
      cookieHeader ? `[${cookieHeader.substring(0, 100)}...]` : "NONE"
    );

    // Get the current user's session from forwarded cookies
    // Zero 0.25: Cookies are forwarded when ZERO_MUTATE_FORWARD_COOKIES=true
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    // Build context following official ztunes/zslack pattern
    const ctx: ZeroContext = session?.user?.id
      ? { userID: session.user.id }
      : undefined;

    console.log(
      "[API /zero/mutate] Processing mutation request for user:",
      ctx?.userID ?? "anon"
    );

    // Note: Using any casts to avoid TypeScript deep type instantiation error
    // This is a known issue with complex Zero types in large schemas
    const result = await handleMutateRequest(
      // biome-ignore lint/suspicious/noExplicitAny: Required to avoid deep type instantiation error
      dbProvider as any,
      // biome-ignore lint/suspicious/noExplicitAny: Required to avoid deep type instantiation error
      async (transact: any) =>
        // biome-ignore lint/suspicious/noExplicitAny: Required to avoid deep type instantiation error
        await transact(async (tx: any, name: string, args: any) => {
          // Use mustGetMutator for type-safe mutator lookup (official pattern)
          const mutator = mustGetMutator(mutators, name);
          return await mutator.fn({ tx, ctx, args });
        }),
      c.req.raw
    );

    return c.json(result);
  } catch (error) {
    console.error("[API /zero/mutate] ❌ Error processing mutation:", error);

    // Check if this is an auth/permission error and return appropriate status
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (
      errorMessage.includes("Authentication required") ||
      errorMessage.includes("not logged in")
    ) {
      // Zero 0.25: Return 401 to trigger 'needs-auth' connection state
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (
      errorMessage.includes("Unauthorized") ||
      errorMessage.includes("Access denied") ||
      errorMessage.includes("Cannot")
    ) {
      // User is authenticated but not authorized for this action
      return c.json({ error: "Forbidden", details: errorMessage }, 403);
    }

    return c.json(
      {
        error: "Mutation processing failed",
        details: errorMessage,
      },
      500
    );
  }
}

app.post("/", handleMutate);

export default app;
