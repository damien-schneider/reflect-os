import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import { createRouter, RouterProvider } from "@tanstack/react-router";

// Load react-grab dev tool in development mode
if (import.meta.env.DEV) {
  import("react-grab");
}

// Import the generated route tree
import { routeTree } from "@/routeTree.gen";

// Create a new router instance
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  // biome-ignore lint/style/useConsistentTypeDefinitions: interface is required for module augmentation
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
