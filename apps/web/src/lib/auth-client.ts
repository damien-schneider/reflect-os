import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { clientEnv } from "@/env/client";


export const authClient = createAuthClient({
  baseURL: clientEnv.VITE_PUBLIC_API_SERVER,
  plugins: [organizationClient()],
});
