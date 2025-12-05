import path from "node:path";
import { getRequestListener } from "@hono/node-server";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";
import { defineConfig } from "vite";

// Load environment variables from root .env file in development
if (process.env.NODE_ENV === "development") {
  dotenv.config({ path: "../../.env" });
}

// Note: Server environment validation happens at runtime, not build time
// Client env vars (VITE_PUBLIC_*) are validated when the app loads
// This avoids build failures when server env vars aren't available during Docker build

export default defineConfig({
  build: {
    target: "es2022",
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2022",
    },
  },
  server: {
    allowedHosts: [".ngrok-free.app", ".ngrok-free.dev", ".ngrok.io"],
  },
  plugins: [
    tanstackRouter(),
    tailwindcss(),
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    {
      name: "api-server",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith("/api")) {
            return next();
          }
          const { app } = await import("./api/index.js");
          getRequestListener(async (request) => await app.fetch(request, {}))(
            req,
            res
          );
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
