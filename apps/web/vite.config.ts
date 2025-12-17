import path from "node:path";
// import { startServer } from "@react-grab/opencode/server";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// if (process.env.NODE_ENV === "development") {
//   startServer();
// }

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
