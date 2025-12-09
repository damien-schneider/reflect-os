/**
 * Build-time environment validation
 *
 * This file validates environment variables at build time using process.env.
 * Import this in vite.config.ts to fail the build if required vars are missing.
 *
 * Uses shared schemas from schema.ts to avoid duplication.
 */
import { createEnv } from "@t3-oss/env-core";
import dotenv from "dotenv";
import { clientSchema } from "./schema";

// Load .env from monorepo root BEFORE validation
dotenv.config({ path: "../../.env" });

export const buildEnv = createEnv({
  clientPrefix: "VITE_PUBLIC_",
  client: clientSchema,
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: false,
  onValidationError: (issues) => {
    console.error("\n❌ Build failed: Invalid environment variables\n");
    for (const issue of issues) {
      console.error(`   ${issue.path?.join(".")}: ${issue.message}`);
    }
    console.error("\n📝 Required VITE_PUBLIC_* variables:");
    console.error("   - VITE_PUBLIC_ZERO_SERVER: URL of Zero sync server");
    console.error("   - VITE_PUBLIC_API_URL: (optional) URL of backend API\n");
    console.error(
      "💡 Set these in your .env file or as environment variables\n"
    );
    throw new Error("Missing required environment variables");
  },
});

console.log("✅ Build-time environment validation passed");
console.log(`   VITE_PUBLIC_ZERO_SERVER: ${buildEnv.VITE_PUBLIC_ZERO_SERVER}`);
if (buildEnv.VITE_PUBLIC_API_URL) {
  console.log(`   VITE_PUBLIC_API_URL: ${buildEnv.VITE_PUBLIC_API_URL}`);
}
