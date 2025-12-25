import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@repo/ui/styles/shadcn.css";
import "@/features/editor/editor.css";
import { createRouter, RouterProvider } from "@tanstack/react-router";

// Import the generated route tree
import { routeTree } from "@/routeTree.gen";

// Create a new router instance
// Note: authClient is imported directly in route files to avoid
// TanStackRouterDevtools serialization issues with Better Auth client
const router = createRouter({
  routeTree,
  context: {},
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
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
