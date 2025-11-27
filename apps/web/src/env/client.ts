import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const clientEnv = createEnv({
  clientPrefix: "VITE_PUBLIC_",
  client: {
    VITE_PUBLIC_ZERO_SERVER: z.url(),
    VITE_PUBLIC_API_SERVER: z.url(),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
