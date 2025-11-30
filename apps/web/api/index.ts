import { Hono } from "hono";
import { handle } from "hono/vercel";
import { SignJWT } from "jose";
import { auth } from "./auth";
import { serverEnv } from "../src/env/server";

export const config = {
  runtime: "edge",
};

export const app = new Hono().basePath("/api");

app.on(["POST", "GET"], "/auth/**", (c) => {
  return auth.handler(c.req.raw);
});

app.get("/zero-token", async (c) => {
  try {
    console.log("[API /zero-token] Fetching session...");
    
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      console.log("[API /zero-token] No session found, returning 401");
      return c.text("Unauthorized", 401);
    }

    console.log("[API /zero-token] Session found for user:", session.user.id);

    if (!serverEnv.ZERO_AUTH_SECRET) {
      console.error("[API /zero-token] ❌ ZERO_AUTH_SECRET is not configured");
      return c.json({ error: "Server misconfigured: ZERO_AUTH_SECRET not set" }, 500);
    }

    const jwtPayload = {
      sub: session.user.id,
      iat: Math.floor(Date.now() / 1000),
    };

    const jwt = await new SignJWT(jwtPayload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30days")
      .sign(new TextEncoder().encode(serverEnv.ZERO_AUTH_SECRET));

    console.log("[API /zero-token] ✅ Token generated successfully for user:", session.user.id);
    return c.json({ token: jwt });
  } catch (error) {
    console.error("[API /zero-token] ❌ Error generating token:", error);
    return c.json({ 
      error: "Failed to generate token",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

export default handle(app);
