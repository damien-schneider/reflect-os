/**
 * Zero Query Endpoint
 *
 * Handles query resolution requests from zero-cache.
 * This endpoint is called by zero-cache to resolve named queries to ZQL.
 *
 * Zero 0.25 Security:
 * - Uses cookie-based auth (cookies forwarded by zero-cache)
 * - Returns 401 for unauthenticated requests that require auth
 * - Returns 403 for unauthorized access attempts
 *
 * Follows the official ztunes/zslack Zero 0.25 pattern.
 */

import { mustGetQuery } from "@rocicorp/zero";
import { handleQueryRequest } from "@rocicorp/zero/server";
import { Hono } from "hono";
import { queries } from "../../../../web/src/queries";
import type { ZeroContext } from "../../../../web/src/zero-context";
import { schema } from "../../../../web/src/zero-schema";
import { auth } from "../../auth";

const app = new Hono();

app.post("/", async (c) => {
  try {
    // Get the current user's session from forwarded cookies
    // Zero 0.25: Cookies are forwarded when ZERO_QUERY_FORWARD_COOKIES=true
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    // Build context following official ztunes/zslack pattern
    const ctx: ZeroContext = session?.user?.id
      ? { userID: session.user.id }
      : undefined;

    console.log(
      "[API /zero/query] Processing query request for user:",
      ctx?.userID ?? "anon"
    );

    const result = await handleQueryRequest(
      (name, args) => {
        // Use mustGetQuery for type-safe query lookup (official pattern)
        const query = mustGetQuery(queries, name);
        return query.fn({ args, ctx });
      },
      schema,
      c.req.raw
    );

    return c.json(result);
  } catch (error) {
    console.error("[API /zero/query] ❌ Error processing query:", error);

    // Check if this is an auth error
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    if (
      errorMessage.includes("Authentication required") ||
      errorMessage.includes("not logged in")
    ) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (errorMessage.includes("Access denied")) {
      return c.json({ error: "Forbidden" }, 403);
    }

    return c.json(
      {
        error: "Query processing failed",
        details: errorMessage,
      },
      500
    );
  }
});

export default app;
