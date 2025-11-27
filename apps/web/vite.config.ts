import { getRequestListener } from "@hono/node-server";
import { tanstackRouter } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dotenv from "dotenv";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// Load environment variables from root .env file in development
if (process.env.NODE_ENV === "development") {
  dotenv.config({ path: "../../.env" });
}

// Validate environment variables at build time
// This ensures the build fails fast if env vars are misconfigured
async function validateEnv() {
  try {
    // Dynamic import to validate server env during build
    await import("./src/env/server");
    console.log("✅ Server environment variables validated");
  } catch (error) {
    console.error("❌ Environment validation failed:");
    console.error(error instanceof Error ? error.message : error);
    // Don't throw in development to allow hot reload
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
}

// Run validation when this config is loaded (build time)
validateEnv();

export default defineConfig({
  build: {
    target: "es2022",
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2022",
    },
  },
  plugins: [
    tanstackRouter(),
    tailwindcss(),
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
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
          getRequestListener(async (request) => {
            return await app.fetch(request, {});
          })(req, res);
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
