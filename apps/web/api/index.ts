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

export default handle(app);
