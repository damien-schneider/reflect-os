/**
 * Backend Server Entry Point
 *
 * Starts the Hono API server with CORS and serves all API routes.
 */

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./env";
import { app as apiRoutes } from "./routes/index";

// Create main app with CORS
const app = new Hono();

// Enable CORS for all routes
app.use(
  "/*",
  cors({
    origin: env.BETTER_AUTH_URL,
    credentials: true,
  })
);

// Mount API routes
app.route("/", apiRoutes);

console.log(`🚀 Backend server starting on http://localhost:${env.PORT}`);
console.log(`   CORS origin: ${env.BETTER_AUTH_URL}`);

serve({
  fetch: app.fetch,
  port: env.PORT,
});
