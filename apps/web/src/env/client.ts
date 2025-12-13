/**
 * Client-side environment variables
 *
 * These are available in the browser via Vite's import.meta.env
 * All client variables must be prefixed with VITE_PUBLIC_
 */
import { createEnv } from "@t3-oss/env-core";
import { clientSchema } from "./schema";

export const clientEnv = createEnv({
  clientPrefix: "VITE_PUBLIC_",
  client: clientSchema,
  runtimeEnv: {
    VITE_PUBLIC_ZERO_SERVER: import.meta.env.VITE_PUBLIC_ZERO_SERVER,
    VITE_PUBLIC_REQUIRE_EMAIL_VERIFICATION: import.meta.env
      .VITE_PUBLIC_REQUIRE_EMAIL_VERIFICATION,
  },
  emptyStringAsUndefined: true,
  skipValidation: false,
  onValidationError: (issues) => {
    console.error("❌ Invalid client environment variables:");
    for (const issue of issues) {
      console.error(`  - ${issue.path?.join(".")}: ${issue.message}`);
    }
    throw new Error("Invalid client environment variables");
  },
});
