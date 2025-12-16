/**
 * Zero Setup Component
 *
 * Zero 0.25 Authentication:
 * - JWT-based auth for zero-cache websocket connection (provides authData.sub)
 * - Cookie forwarding for query/mutate HTTP endpoints (provides session cookies)
 *
 * This dual approach is needed because:
 * 1. Zero-cache needs authData.sub to apply row-level permissions on sync
 * 2. Query/mutate endpoints need session cookies for server-side validation
 *
 * References:
 * - https://zero.rocicorp.dev/docs/auth
 * - https://github.com/rocicorp/ztunes (reference implementation)
 */

import { useConnectionState, ZeroProvider } from "@rocicorp/zero/react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { clientEnv } from "@/env/client";
import { authClient } from "@/lib/auth-client";
import { mutators } from "@/mutators";
import { queries } from "@/queries";
import { schema } from "@/schema";
import type { ZeroContext } from "@/zero-context";
// Import to register DefaultTypes
import "@/zero-context";

type ZeroState = {
  status: "loading" | "ready" | "error";
  userID: string;
  authToken: string | undefined;
  error?: string;
};

export function ZeroSetup({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ZeroState>({
    status: "loading",
    userID: "anon",
    authToken: undefined,
  });

  const { data: session, isPending } = authClient.useSession();
  const fetchingRef = useRef(false);

  // Determine userID from session
  // Zero: userID segregates client-side storage per user
  const userID = session?.user?.id ?? "anon";

  // Initialize Zero when session state changes
  useEffect(() => {
    // Don't run while auth is still pending
    if (isPending) {
      console.log("[ZeroSetup] Auth pending, waiting...");
      return;
    }

    // Prevent duplicate fetches
    if (fetchingRef.current) {
      return;
    }

    const initZero = async () => {
      fetchingRef.current = true;

      console.log("[ZeroSetup] Initializing Zero...", {
        hasSession: !!session,
        userID,
        cacheURL: clientEnv.VITE_PUBLIC_ZERO_SERVER,
      });

      // Fetch JWT token for authenticated users
      // This is needed for zero-cache to know the user identity (authData.sub)
      let authToken: string | undefined;
      if (session?.user?.id) {
        // Fetch JWT token for authenticated users
        // This token is sent to zero-cache to set authData.sub for permissions
        try {
          const response = await fetch("/api/zero-token", {
            credentials: "include", // Include session cookies
          });

          if (response.ok) {
            const data = await response.json();
            authToken = data.token;
          } else if (response.status === 401) {
            console.log("[ZeroSetup] Not authenticated, skipping token fetch");
          } else {
            throw new Error(`Token fetch failed: ${response.status}`);
          }
        } catch (error) {
          console.error("[ZeroSetup] Error fetching token:", error);
        }
        console.log("[ZeroSetup] Got auth token:", authToken ? "yes" : "no");
      }

      setState({
        status: "ready",
        userID,
        authToken,
      });

      fetchingRef.current = false;
    };

    initZero();
  }, [session, isPending, userID]);

  const handleRetry = () => {
    console.log("[ZeroSetup] Retrying Zero connection...");
    setState({ status: "loading", userID: "anon", authToken: undefined });
    fetchingRef.current = false;
    // Force a re-initialization
    window.location.reload();
  };

  // Handle schema version updates - reload the page when needed
  const handleUpdateNeeded = (reason: { type: string }) => {
    console.log("[ZeroSetup] Update needed:", reason);
    if (reason.type === "SchemaVersionNotSupported") {
      console.log("[ZeroSetup] Schema version not supported, reloading...");
      setTimeout(() => window.location.reload(), 100);
    }
  };

  // Zero: Context is passed to queries and mutators for auth-aware data access
  const context: ZeroContext =
    state.userID !== "anon" ? { userID: state.userID } : undefined;

  // Zero props:
  // - `auth` provides JWT token to zero-cache for authData.sub
  // - `cacheURL` points to zero-cache
  // - `context` passes auth info to queries/mutators
  // - Cookie forwarding handles session auth for query/mutate endpoints
  const zeroProps = {
    userID: state.userID,
    // JWT token for zero-cache to authenticate websocket connection
    // This sets authData.sub for row-level permissions
    auth: state.authToken,
    cacheURL: clientEnv.VITE_PUBLIC_ZERO_SERVER,
    schema,
    // Context for auth-aware queries and mutators
    context,
    // Named queries and mutators
    queries,
    mutators,
    // Server endpoints for query resolution and mutation execution
    // These receive forwarded cookies for authentication
    queryURL: "/api/zero/query",
    mutateURL: "/api/zero/mutate",
  };

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
    <ZeroProvider {...zeroProps} onUpdateNeeded={handleUpdateNeeded}>
      <ZeroConnectionHandler onNeedsAuth={handleRetry} />
      {children}
    </ZeroProvider>
  );
}

/**
 * Internal component to handle connection state changes.
 * Zero: Use Connection Status API for auth failures and errors.
 * When 'needs-auth' occurs, the user should re-authenticate.
 */
function ZeroConnectionHandler({ onNeedsAuth }: { onNeedsAuth: () => void }) {
  const connectionState = useConnectionState();
  const { data: session } = authClient.useSession();
  const hasTriggeredReauth = useRef(false);

  useEffect(() => {
    console.log("[ZeroSetup] Connection state:", connectionState.name);

    // Handle needs-auth state - session expired or token invalid
    if (connectionState.name === "needs-auth") {
      console.log("[ZeroSetup] Connection needs auth...");

      // Prevent multiple re-auth attempts
      if (hasTriggeredReauth.current) {
        console.log("[ZeroSetup] Already triggered re-auth, skipping...");
        return;
      }

      // If user has a session, try reconnecting (token might be stale)
      // If no session, they need to log in
      if (session) {
        console.log(
          "[ZeroSetup] User has session, triggering page reload to refresh token..."
        );
        hasTriggeredReauth.current = true;
        onNeedsAuth();
      } else {
        console.log("[ZeroSetup] No session - user needs to log in");
        // Don't auto-redirect - let the app handle showing login UI
      }
    }

    // Reset the flag when connection is successful
    if (connectionState.name === "connected") {
      hasTriggeredReauth.current = false;
    }

    // Log errors but don't block - these are recoverable
    if (connectionState.name === "error") {
      console.error(
        "[ZeroSetup] Connection error:",
        "reason" in connectionState ? connectionState.reason : "unknown"
      );
    }
  }, [connectionState, onNeedsAuth, session]);

  return null;
}
