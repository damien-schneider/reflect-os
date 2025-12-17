/**
 * Auth Routes
 *
 * Handles authentication via better-auth.
 */

import { Hono } from "hono";
import { auth } from "../auth";

const app = new Hono();

// All auth routes are handled by better-auth
// Using /* to match all paths under this route (e.g., /verify-email, /sign-in, etc.)
app.on(["POST", "GET"], "/*", async (c) => {
  const url = new URL(c.req.raw.url);
  console.log(
    `[Auth Route] Incoming request: ${c.req.method} ${url.pathname}${url.search}`
  );
  console.log(`[Auth Route] Full URL: ${c.req.raw.url}`);
  console.log(`[Auth Route] Request path: ${c.req.path}`);

  const response = await auth.handler(c.req.raw);

  console.log(`[Auth Route] Response status: ${response.status}`);
  if (response.status === 404) {
    console.log(
      `[Auth Route] 404 response - Better Auth couldn't match route for: ${url.pathname}`
    );
  }

  return response;
});

export default app;
