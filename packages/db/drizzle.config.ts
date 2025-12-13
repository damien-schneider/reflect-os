import { defineConfig } from "drizzle-kit";

if (!process.env.ZERO_UPSTREAM_DB) {
  throw new Error(
    "ZERO_UPSTREAM_DB environment variable is required for database migrations. " +
      "Set it in your .env file or environment variables."
  );
}

export default defineConfig({
  out: "./migrations",
  schema: "./src/schema.ts",
  dialect: "postgresql",
  strict: true,
  dbCredentials: {
    url: process.env.ZERO_UPSTREAM_DB,
  },
});
