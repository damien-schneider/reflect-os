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
app.on(["POST", "GET"], "/*", (c) => auth.handler(c.req.raw));

export default app;
