import { polarClient } from "@polar-sh/better-auth";
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Use relative URL for API calls since the API is served from the same origin
// This avoids cross-origin issues and SSL certificate problems
export const authClient = createAuthClient({
  baseURL: "", // Empty string = same origin
  plugins: [organizationClient(), polarClient()],
});
