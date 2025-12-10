import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Validate VITE_PUBLIC_* environment variables at build time
// This import will throw if required vars are missing
// Note: build.ts loads .env internally before validation
import "./src/env/build";

// Backend server port (default 3001 for development)
const BACKEND_PORT = process.env.BACKEND_PORT ?? "3001";

export default defineConfig({
  build: {
    target: "es2022",
    rollupOptions: {
      // Externalize Node.js built-ins that should not be bundled for browser
      external: ["node:module", "node:async_hooks"],
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2022",
    },
    // Exclude packages that import Node.js built-ins
    exclude: ["@polar-sh/better-auth"],
  },
  server: {
    allowedHosts: [".ngrok-free.app", ".ngrok-free.dev", ".ngrok.io"],
    // Proxy /api/* requests to the backend server in development
    proxy: {
      "/api": {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true,
      },
    },
  },
  plugins: [
    tanstackRouter(),
    tailwindcss(),
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
