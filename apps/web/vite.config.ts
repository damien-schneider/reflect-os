import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";
import { defineConfig } from "vite";

// Load environment variables from root .env file in development
if (process.env.NODE_ENV === "development") {
  dotenv.config({ path: "../../.env" });
}

// Backend server port (default 3001 for development)
const BACKEND_PORT = process.env.BACKEND_PORT ?? "3001";

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
