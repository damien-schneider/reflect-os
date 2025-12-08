/**
 * API Routes Index
 *
 * Central router that mounts all API route modules.
 */

import { Hono } from "hono";
import authRoutes from "./auth";
import productsRoutes from "./products";
import subscriptionRoutes from "./subscription";
import zeroTokenRoutes from "./zero-token";

export const app = new Hono()
  .basePath("/api")
  .route("/auth", authRoutes)
  .route("/products", productsRoutes)
  .route("/zero-token", zeroTokenRoutes)
  .route("/", subscriptionRoutes);

// Export app type for hono/client
export type AppType = typeof app;
