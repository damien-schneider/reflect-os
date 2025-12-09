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

// Regex for removing trailing slashes
const trailingSlashRegex = /\/$/;

// Build allowed origins list
const getAllowedOrigins = (): string[] => {
  const origins: string[] = [];

  // Always allow the configured auth URL
  if (env.BETTER_AUTH_URL) {
    origins.push(env.BETTER_AUTH_URL);
    // Also allow without trailing slash
    origins.push(env.BETTER_AUTH_URL.replace(trailingSlashRegex, ""));
  }

  // In development, allow localhost variations
  if (env.NODE_ENV === "development") {
    origins.push(
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000"
    );
  }

  return [...new Set(origins)]; // Remove duplicates
};

// Create main app with CORS
const app = new Hono();

// Enable CORS for all routes
const allowedOrigins = getAllowedOrigins();
app.use(
  "/*",
  cors({
    origin: (origin) => {
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin) {
        return env.BETTER_AUTH_URL;
      }
      // Check if origin is in allowed list
      return allowedOrigins.includes(origin) ? origin : null;
    },
    credentials: true,
  })
);

// Mount API routes
app.route("/", apiRoutes);

console.log(`🚀 Backend server starting on http://localhost:${env.PORT}`);
console.log(`   CORS origins: ${allowedOrigins.join(", ")}`);

serve({
  fetch: app.fetch,
  port: env.PORT,
});
