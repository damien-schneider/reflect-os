import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./src/schema.ts",
  dialect: "postgresql",
  strict: true,
  dbCredentials: {
    url:
      process.env.ZERO_UPSTREAM_DB ||
      "postgresql://user:password@127.0.0.1:5430/postgres",
  },
});
