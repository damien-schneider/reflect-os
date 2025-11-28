import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { Pool } from "pg";
import { serverEnv } from "../src/env/server";

const isProduction = serverEnv.NODE_ENV === "production";

console.log("Better Auth initialized with:", {
  baseURL: serverEnv.BETTER_AUTH_URL,
  isProduction,
  databaseConnected: !!serverEnv.ZERO_UPSTREAM_DB,
});

export const auth = betterAuth({
  database: new Pool({
    connectionString: serverEnv.ZERO_UPSTREAM_DB,
  }),
  baseURL: serverEnv.BETTER_AUTH_URL,
  trustedOrigins: [serverEnv.BETTER_AUTH_URL],
  plugins: [organization()],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: isProduction,
    },
    useSecureCookies: isProduction,
  },
  logger: {
    level: "debug", // Always debug to see errors in production logs
  },
});
