/**
 * API Routes Index
 *
 * Central router that mounts all API route modules.
 */

import { Hono } from "hono";
import authRoutes from "./auth";
import changelogRoutes from "./changelog";
import productsRoutes from "./products";
import subscriptionRoutes from "./subscription";
import { mutateRoutes, queryRoutes } from "./zero";
import zeroTokenRoutes from "./zero-token";

export const app = new Hono()
  .basePath("/api")
  .route("/auth", authRoutes)
  .route("/changelog", changelogRoutes)
  .route("/products", productsRoutes)
  .route("/zero-token", zeroTokenRoutes)
  .route("/zero/query", queryRoutes)
  .route("/zero/mutate", mutateRoutes)
  .route("/", subscriptionRoutes);

// Export app type for hono/client
export type AppType = typeof app;
