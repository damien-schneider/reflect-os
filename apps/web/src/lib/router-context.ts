// Router context type - currently empty as authClient is imported directly where needed
// This avoids TanStackRouterDevtools serialization issues with Better Auth client
export type RouterAppContext = Record<string, never>;
