// TODO: Think maybe of removing completely and directly call the backend endpoint.
// Production server for the web application
// Serves static frontend and proxies API requests to backend

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { serverEnv } from "./src/env/server";

const env = serverEnv;

console.log(`Web server configuration:
  PORT: ${env.PORT}
  INTERNAL_API_URL: ${env.INTERNAL_API_URL}
  NODE_ENV: ${env.NODE_ENV}
`);

// Create main app
const app = new Hono();

// Proxy API requests to backend (using internal Docker URL)
// Must be registered before static file serving
app.all("/api/*", async (c) => {
  const url = new URL(c.req.url);
  const backendUrl = `${env.INTERNAL_API_URL}${url.pathname}${url.search}`;

  console.log(
    `[Proxy] ${c.req.method} ${url.pathname}${url.search} -> ${backendUrl}`
  );

  try {
    const response = await fetch(backendUrl, {
      method: c.req.method,
      headers: c.req.raw.headers,
      body:
        c.req.method !== "GET" && c.req.method !== "HEAD"
          ? c.req.raw.body
          : undefined,
      // @ts-expect-error - duplex is needed for streaming request bodies
      duplex: "half",
      // Don't follow redirects - return them to the browser so it can handle them
      redirect: "manual",
    });

    console.log(`[Proxy] Response: ${response.status} ${response.statusText}`);

    // Important: Node/undici fetch treats `set-cookie` specially.
    // When proxying, we must explicitly forward all Set-Cookie headers
    // or auth sessions won't persist in the browser.
    const proxiedHeaders = new Headers(response.headers);
    const getSetCookie = (
      response.headers as unknown as {
        getSetCookie?: () => string[];
      }
    ).getSetCookie;
    if (typeof getSetCookie === "function") {
      const cookies = getSetCookie.call(response.headers);
      if (Array.isArray(cookies)) {
        for (const cookie of cookies) {
          proxiedHeaders.append("set-cookie", cookie);
        }
      }
    }

    // Forward the response
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: proxiedHeaders,
    });
  } catch (error) {
    console.error("[Proxy] Error:", error);
    return c.json({ error: "Backend unavailable" }, 503);
  }
});

// Serve static files from dist directory (for assets, js, css, etc.)
app.use("/*", serveStatic({ root: "./dist" }));

// Fallback to index.html for SPA routing (client-side routes)
app.get("*", serveStatic({ path: "./dist/index.html" }));

console.log(`🚀 Web server starting on http://localhost:${env.PORT}`);

serve({
  fetch: app.fetch,
  port: env.PORT,
});
