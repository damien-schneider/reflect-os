import { ZeroProvider } from "@rocicorp/zero/react";
import { schema } from "../schema";
import { authClient } from "../lib/auth-client";
import { useEffect, useState } from "react";
import { clientEnv } from "@/env/client";

export function ZeroSetup({ children }: { children: React.ReactNode }) {
  const [authData, setAuthData] = useState<{
    userID: string;
    auth?: string;
  } | null>(null);

  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    async function fetchToken() {
      if (session) {
        const res = await fetch("/api/zero-token");
        if (res.ok) {
          const { token } = await res.json();
          setAuthData({ userID: session.user.id, auth: token });
        } else {
          // Fallback or error handling?
          // For now, if token fetch fails, maybe fallback to anon or just log
          console.error("Failed to fetch zero token");
          setAuthData({ userID: "anon" });
        }
      } else if (!isPending) {
        setAuthData({ userID: "anon" });
      }
    }

    fetchToken();
  }, [session, isPending]);

  if (!authData) {
    return <div>Loading Zero...</div>;
  }

  return (
    <ZeroProvider
      userID={authData.userID}
      auth={authData.auth}
      server={clientEnv.VITE_PUBLIC_ZERO_SERVER}
      schema={schema}
    >
      {children}
    </ZeroProvider>
  );
}
