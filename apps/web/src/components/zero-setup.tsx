/**
 * Zero Setup Component
 *
 * Zero 0.25 Authentication:
 * - Cookie-based auth: cookies are forwarded to query/mutate endpoints via zero-cache
 * - ZERO_QUERY_FORWARD_COOKIES and ZERO_MUTATE_FORWARD_COOKIES must be set to "true"
 * - Your query/mutate endpoints extract the session from cookies and pass as context
 *
 * This is simpler than JWT-based auth as:
 * 1. No token endpoint needed
 * 2. Session management is handled by better-auth cookies
 * 3. Zero-cache forwards cookies automatically
 *
 * References:
 * - https://zero.rocicorp.dev/docs/auth
 * - https://github.com/rocicorp/zslack (reference implementation)
 */

import { Button } from "@repo/ui/components/button";
import { dropAllDatabases } from "@rocicorp/zero";
import { useConnectionState, ZeroProvider } from "@rocicorp/zero/react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { clientEnv } from "@/env/client";
import { authClient } from "@/lib/auth-client";
import { mutators } from "@/mutators";
import { queries } from "@/queries";
import { schema } from "@/schema";
import type { ZeroContext } from "@/zero-context";
// Import to register DefaultTypes
import "@/zero-context";

interface ZeroState {
  status: "loading" | "ready" | "error";
  userID: string;
  error?: string;
}

export function ZeroSetup({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ZeroState>({
    status: "loading",
    userID: "anon",
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

    const initZero = () => {
      fetchingRef.current = true;

      console.log("[ZeroSetup] Initializing Zero...", {
        hasSession: !!session,
        userID,
        cacheURL: clientEnv.VITE_PUBLIC_ZERO_SERVER,
      });

      // Zero 0.25: Cookie-based auth - no token needed
      // Cookies are automatically forwarded by zero-cache to query/mutate endpoints
      // when ZERO_QUERY_FORWARD_COOKIES and ZERO_MUTATE_FORWARD_COOKIES are set

      setState({
        status: "ready",
        userID,
      });

      fetchingRef.current = false;
    };

    initZero();
  }, [session, isPending, userID]);

  const handleRetry = () => {
    console.log("[ZeroSetup] Retrying Zero connection...");
    setState({ status: "loading", userID: "anon" });
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

  // Zero 0.25 Configuration:
  // - `server` (or `cacheURL`) points to zero-cache for real-time sync and query/mutate
  // - `context` passes auth info to queries/mutators
  // - Cookie forwarding is handled by zero-cache env vars:
  //   ZERO_QUERY_FORWARD_COOKIES=true and ZERO_MUTATE_FORWARD_COOKIES=true
  // - ZERO_QUERY_URL and ZERO_MUTATE_URL env vars tell zero-cache where to send requests
  //
  // NOTE: Do NOT pass queryURL/mutateURL to ZeroProvider - zero-cache handles routing.
  // The browser sends cookies to zero-cache (cross-origin), and zero-cache forwards
  // them to the backend's query/mutate endpoints.
  const zeroProps = {
    userID: state.userID,
    server: clientEnv.VITE_PUBLIC_ZERO_SERVER,
    schema,
    // Context for auth-aware queries and mutators
    context,
    // Named queries and mutators
    queries,
    mutators,
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
 * Clear all Zero/Replicache data from IndexedDB.
 * This should be called on auth errors to ensure a clean slate.
 */
async function clearZeroData(): Promise<void> {
  try {
    console.log("[ZeroSetup] Clearing Zero IndexedDB data...");
    const result = await dropAllDatabases();
    console.log("[ZeroSetup] Zero data cleared:", result);
  } catch (error) {
    console.error("[ZeroSetup] Failed to clear Zero data:", error);
  }
}

/**
 * Handle complete logout - clear Zero data, sign out, and redirect.
 */
async function handleAuthError(): Promise<void> {
  console.log("[ZeroSetup] Handling auth error - clearing all data...");

  // Clear Zero IndexedDB data
  await clearZeroData();

  // Sign out from better-auth (clears session cookies)
  try {
    await authClient.signOut();
  } catch (error) {
    console.error("[ZeroSetup] Sign out error (continuing anyway):", error);
  }

  // Redirect to login page
  window.location.href = "/login";
}

/**
 * Internal component to handle connection state changes.
 * Zero: Use Connection Status API for auth failures and errors.
 * When 'needs-auth' occurs, we clear all Zero data and redirect to login.
 */
function ZeroConnectionHandler({ onNeedsAuth }: { onNeedsAuth: () => void }) {
  const connectionState = useConnectionState();
  const { data: session } = authClient.useSession();
  const hasTriggeredReauth = useRef(false);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: auth error handling requires multiple state checks
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

      hasTriggeredReauth.current = true;

      // If user has a session but Zero says needs-auth, there's a mismatch
      // This can happen with stale IndexedDB data - clear everything and re-auth
      if (session) {
        console.log(
          "[ZeroSetup] User has session but Zero needs auth - clearing Zero data and retrying..."
        );
        // Clear Zero data and reload to get a fresh state
        clearZeroData().then(() => {
          onNeedsAuth();
        });
      } else {
        console.log(
          "[ZeroSetup] No session and Zero needs auth - redirecting to login..."
        );
        // No session - user needs to log in
        // Clear any stale Zero data before redirecting
        handleAuthError();
      }
    }

    // Reset the flag when connection is successful
    if (connectionState.name === "connected") {
      hasTriggeredReauth.current = false;
    }

    // Handle connection errors - may indicate auth issues
    if (connectionState.name === "error") {
      const reason =
        "reason" in connectionState ? connectionState.reason : "unknown";
      console.error("[ZeroSetup] Connection error:", reason);

      // If the error mentions authentication, treat it as an auth error
      if (
        typeof reason === "string" &&
        (reason.toLowerCase().includes("auth") ||
          reason.toLowerCase().includes("unauthorized") ||
          reason.toLowerCase().includes("401"))
      ) {
        console.log(
          "[ZeroSetup] Auth-related error detected - clearing data..."
        );
        if (!hasTriggeredReauth.current) {
          hasTriggeredReauth.current = true;
          handleAuthError();
        }
      }
    }
  }, [connectionState, onNeedsAuth, session]);

  return null;
}
