// Production server for the web application
// Serves both the static frontend and the API

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { SignJWT } from "jose";
import { auth } from "./api/auth.js";

// Initialize server environment
const serverEnv = {
  ZERO_UPSTREAM_DB: process.env.ZERO_UPSTREAM_DB!,
  ZERO_AUTH_SECRET: process.env.ZERO_AUTH_SECRET!,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL!,
};

// Validate required environment variables
const requiredEnvVars = ['ZERO_UPSTREAM_DB', 'ZERO_AUTH_SECRET', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

console.log(`Auth configuration:
  BETTER_AUTH_URL: ${serverEnv.BETTER_AUTH_URL}
  NODE_ENV: ${process.env.NODE_ENV}
`);

const PORT = parseInt(process.env.PORT || "3000", 10);

// Create API app
const apiApp = new Hono();

// Enable CORS for API routes
apiApp.use("/*", cors({
  origin: serverEnv.BETTER_AUTH_URL,
  credentials: true,
}));

apiApp.on(["POST", "GET"], "/auth/**", async (c) => {
  try {
    return await auth.handler(c.req.raw);
  } catch (error) {
    console.error("Auth error:", error);
    throw error;
  }
});

apiApp.get("/zero-token", async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.text("Unauthorized", 401);
  }

  const jwtPayload = {
    sub: session.user.id,
    iat: Math.floor(Date.now() / 1000),
  };

  const jwt = await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30days")
    .sign(new TextEncoder().encode(serverEnv.ZERO_AUTH_SECRET));

  return c.json({ token: jwt });
});

// Create main app
const app = new Hono();

// Mount API routes
app.route("/api", apiApp);

// Serve static files from dist directory
app.use("/*", serveStatic({ root: "./dist" }));

// Fallback to index.html for SPA routing
app.get("*", serveStatic({ path: "./dist/index.html" }));

console.log(`🚀 Server starting on http://localhost:${PORT}`);

serve({
  fetch: app.fetch,
  port: PORT,
});
