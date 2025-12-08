/**
 * Zero Token Routes
 *
 * Generates JWT tokens for Zero sync authentication.
 */

import { Hono } from "hono";
import { SignJWT } from "jose";
import { auth } from "../auth";
import { env } from "../env";

const app = new Hono();

app.get("/", async (c) => {
  try {
    console.log("[API /zero-token] Fetching session...");

    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      console.log("[API /zero-token] No session found, returning 401");
      return c.json({ error: "Unauthorized" }, 401);
    }

    console.log("[API /zero-token] Session found for user:", session.user.id);

    if (!env.ZERO_AUTH_SECRET) {
      console.error("[API /zero-token] ❌ ZERO_AUTH_SECRET is not configured");
      return c.json(
        { error: "Server misconfigured: ZERO_AUTH_SECRET not set" },
        500
      );
    }

    const jwtPayload = {
      sub: session.user.id,
      iat: Math.floor(Date.now() / 1000),
    };

    const jwt = await new SignJWT(jwtPayload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30days")
      .sign(new TextEncoder().encode(env.ZERO_AUTH_SECRET));

    console.log(
      "[API /zero-token] ✅ Token generated successfully for user:",
      session.user.id
    );
    return c.json({ token: jwt });
  } catch (error) {
    console.error("[API /zero-token] ❌ Error generating token:", error);
    return c.json(
      {
        error: "Failed to generate token",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export default app;
