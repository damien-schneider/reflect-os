import { ZeroProvider } from "@rocicorp/zero/react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { clientEnv } from "@/env/client";
import { authClient } from "@/lib/auth-client";
import { schema } from "@/schema";

type ZeroState = {
  status: "loading" | "ready" | "error";
  userID: string;
  error?: string;
};

// Fetch Zero token from API
async function fetchZeroToken(): Promise<string | null> {
  try {
    console.log("[ZeroSetup] Fetching Zero auth token...");
    const res = await fetch("/api/zero-token");

    if (res.ok) {
      const { token } = await res.json();
      console.log("[ZeroSetup] ✅ Zero token obtained successfully");
      return token;
    }
    const errorText = await res.text();
    console.error(
      "[ZeroSetup] ❌ Failed to fetch Zero token:",
      res.status,
      errorText
    );
    return null;
  } catch (err) {
    console.error("[ZeroSetup] ❌ Error fetching Zero token:", err);
    return null;
  }
}

export function ZeroSetup({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ZeroState>({
    status: "loading",
    userID: "anon",
  });
  const [retryCount, setRetryCount] = useState(0);

  const { data: session, isPending } = authClient.useSession();

  // Determine userID from session - must match the JWT's `sub` field
  // Per Zero docs: "userID must match the sub field from token"
  const userID = session?.user?.id ?? "anon";

  // Create auth function for Zero - this is called when Zero needs a token
  // Using async function allows Zero to automatically refresh tokens
  // Per Zero docs: "This function is called by Zero if token verification fails"
  const authFunction = useCallback(async () => {
    if (!session) {
      console.log("[ZeroSetup] No session, returning undefined for auth");
      return;
    }

    const token = await fetchZeroToken();
    if (!token) {
      throw new Error("Failed to fetch Zero authentication token");
    }
    return token;
  }, [session]);

  // Initialize Zero when session state changes
  useEffect(() => {
    // Don't run while auth is still pending
    if (isPending) {
      console.log("[ZeroSetup] Auth pending, waiting...");
      return;
    }

    let isCancelled = false;

    console.log("[ZeroSetup] Initializing Zero...", {
      hasSession: !!session,
      userID,
      server: clientEnv.VITE_PUBLIC_ZERO_SERVER,
      retryCount,
    });

    async function initializeZero() {
      // For anonymous users, we're ready immediately
      if (!session) {
        console.log("[ZeroSetup] No session, setting up anonymous user");
        // Use setTimeout to avoid synchronous setState in effect
        setTimeout(() => {
          if (!isCancelled) {
            setState({
              status: "ready",
              userID: "anon",
            });
          }
        }, 0);
        return;
      }

      // For authenticated users, verify we can get a token before showing as ready
      try {
        const token = await fetchZeroToken();
        if (isCancelled) {
          return;
        }

        if (token) {
          setState({
            status: "ready",
            userID: session.user.id,
          });
        } else {
          setState({
            status: "error",
            userID: "anon",
            error: "Failed to authenticate with Zero server",
          });
        }
      } catch (err) {
        if (isCancelled) {
          return;
        }
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        console.error("[ZeroSetup] ❌ Error verifying auth:", err);
        setState({
          status: "error",
          userID: "anon",
          error: `Failed to connect to Zero server: ${errorMessage}`,
        });
      }
    }

    initializeZero();

    return () => {
      isCancelled = true;
    };
  }, [session, isPending, userID, retryCount]);

  const handleRetry = () => {
    console.log("[ZeroSetup] Retrying Zero connection...");
    setState({ status: "loading", userID: "anon" });
    setRetryCount((c) => c + 1);
  };

  // Handle schema version updates - reload the page when needed
  const handleUpdateNeeded = useCallback((reason: { type: string }) => {
    console.log("[ZeroSetup] Update needed:", reason);
    if (reason.type === "SchemaVersionNotSupported") {
      console.log("[ZeroSetup] Schema version not supported, reloading...");
      // Give user a moment to see any pending UI changes
      setTimeout(() => window.location.reload(), 100);
    }
  }, []);

  // Memoize ZeroProvider props to prevent unnecessary re-renders
  const zeroProps = useMemo(
    () => ({
      userID: state.userID,
      // Use async function for auth - Zero will call this when token verification fails
      // This enables automatic token refresh
      auth:
        state.status === "ready" && state.userID !== "anon"
          ? authFunction
          : undefined,
      server: clientEnv.VITE_PUBLIC_ZERO_SERVER,
      schema,
    }),
    [state.userID, state.status, authFunction]
  );

  // Loading state
  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          Connecting to sync server...
        </p>
      </div>
    );
  }

  // Error state
  if (state.status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <div className="max-w-md space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Connection Error</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Unable to connect to the sync server. This may be temporary.
            </p>
          </div>
          {state.error && (
            <p className="rounded-md bg-destructive/10 p-3 font-mono text-destructive text-xs">
              {state.error}
            </p>
          )}
          <Button className="gap-2" onClick={handleRetry} variant="outline">
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ZeroProvider
      {...zeroProps}
      onError={(msg, ...rest) => {
        console.error("[ZeroProvider] ❌ Zero runtime error:", msg, ...rest);
      }}
      onUpdateNeeded={handleUpdateNeeded}
    >
      {children}
    </ZeroProvider>
  );
}
