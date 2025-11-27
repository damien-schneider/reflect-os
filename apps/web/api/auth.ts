import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { Pool } from "pg";
import { serverEnv } from "../src/env/server";



export const auth = betterAuth({
  database: new Pool({
    connectionString: serverEnv.ZERO_UPSTREAM_DB,
  }),
  plugins: [organization()],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: false, // For localhost
    },
  },
});
