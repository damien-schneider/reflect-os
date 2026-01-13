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
  // Load .env files from monorepo root instead of app directory
  envDir: path.resolve(__dirname, "../.."),
  build: {
    target: "es2022",
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2022",
    },
    // Force include @rocicorp/zero/react with its React dependencies
    // This ensures proper React resolution during pre-bundling
    include: ["react", "react-dom", "@rocicorp/zero/react"],
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
