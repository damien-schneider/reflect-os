import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { authClient } from "../../lib/auth-client";
import { useZero, useQuery } from "@rocicorp/zero/react";
import { Loader2, Plus, Building2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/button";
import type { Schema } from "../../schema";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});

// Maximum time to wait for Zero sync before showing error (in ms)
const SYNC_TIMEOUT_MS = 15000;
// Maximum number of sync retry attempts
const MAX_SYNC_ATTEMPTS = 30;

function DashboardIndex() {
  const navigate = useNavigate();
  const { data: organizations, isPending: authPending, error: authError } = authClient.useListOrganizations();
  const { data: session } = authClient.useSession();
  const hasRedirected = useRef(false);
  const z = useZero<Schema>();
  const [syncAttempts, setSyncAttempts] = useState(0);
  const [syncTimedOut, setSyncTimedOut] = useState(false);
  const [syncStartTime] = useState(() => Date.now());
  
  // Get the first org's ID to check if Zero has synced it
  const firstOrgId = organizations?.[0]?.id ?? "";
  const userId = session?.user?.id ?? "";
  
  // Query Zero member table to see if the org membership is synced
  // Member table has simpler permissions (allowIfLoggedIn) than organization table
  const [zeroMembers, { type: queryStatus }] = useQuery(
    z.query.member
      .where("organizationId", "=", firstOrgId)
      .where("userId", "=", userId)
  );
  const zeroOrgSynced = zeroMembers && zeroMembers.length > 0;
  const zeroQueryComplete = queryStatus === "complete";

  // Log sync status for debugging
  useEffect(() => {
    console.log("[DashboardIndex] Sync status:", {
      authPending,
      authError: authError?.message,
      organizationsCount: organizations?.length ?? 0,
      firstOrgId,
      userId,
      queryStatus,
      zeroMembersCount: zeroMembers?.length ?? 0,
      zeroOrgSynced,
      syncAttempts,
      syncTimedOut,
      elapsedMs: Date.now() - syncStartTime,
    });
  }, [authPending, authError, organizations, firstOrgId, userId, queryStatus, zeroMembers, zeroOrgSynced, syncAttempts, syncTimedOut, syncStartTime]);

  // Check for sync timeout
  useEffect(() => {
    if (
      organizations && 
      organizations.length > 0 && 
      userId &&
      zeroQueryComplete && 
      !zeroOrgSynced &&
      !syncTimedOut
    ) {
      const elapsed = Date.now() - syncStartTime;
      if (elapsed >= SYNC_TIMEOUT_MS) {
        console.error("[DashboardIndex] ❌ Zero sync timed out after", elapsed, "ms");
        setSyncTimedOut(true);
      }
    }
  }, [organizations, userId, zeroQueryComplete, zeroOrgSynced, syncTimedOut, syncStartTime, syncAttempts]);

  // Retry sync check periodically if org exists in Better Auth but not in Zero yet
  useEffect(() => {
    if (
      organizations && 
      organizations.length > 0 && 
      userId &&
      zeroQueryComplete && 
      !zeroOrgSynced && 
      syncAttempts < MAX_SYNC_ATTEMPTS &&
      !syncTimedOut
    ) {
      const timer = setTimeout(() => {
        setSyncAttempts((prev) => prev + 1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [organizations, userId, zeroQueryComplete, zeroOrgSynced, syncAttempts, syncTimedOut]);

  useEffect(() => {
    // Only redirect when:
    // 1. Better Auth has orgs
    // 2. Zero has synced the org (or we've waited long enough)
    // 3. We haven't redirected yet
    if (
      !authPending && 
      organizations && 
      organizations.length > 0 && 
      !hasRedirected.current &&
      (zeroOrgSynced || syncAttempts >= MAX_SYNC_ATTEMPTS)
    ) {
      console.log("[DashboardIndex] ✅ Redirecting to org:", organizations[0].slug);
      hasRedirected.current = true;
      navigate({
        to: "/dashboard/$orgSlug",
        params: { orgSlug: organizations[0].slug },
        replace: true,
      });
    }
  }, [organizations, authPending, navigate, zeroOrgSynced, syncAttempts]);

  // Handle retry
  const handleRetry = () => {
    console.log("[DashboardIndex] Retrying sync...");
    setSyncAttempts(0);
    setSyncTimedOut(false);
    window.location.reload();
  };

  // Auth error state
  if (authError) {
    console.error("[DashboardIndex] ❌ Auth error:", authError);
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="h-12 w-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Authentication Error</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Unable to load your organizations. Please try again.
            </p>
          </div>
          <p className="text-xs text-destructive bg-destructive/10 p-3 rounded-md font-mono">
            {authError.message}
          </p>
          <Button onClick={handleRetry} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Still loading from Better Auth
  if (authPending) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No organizations - show welcome screen
  if (!organizations || organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="max-w-md text-center space-y-6">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold">Welcome to the Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Get started by creating your first organization to manage feedback and roadmaps.
            </p>
          </div>

          <Button asChild size="lg" className="gap-2">
            <Link to="/dashboard/account">
              <Plus className="h-4 w-4" />
              Create Organization
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Sync timed out - show error state
  if (syncTimedOut) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="h-12 w-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Sync Timeout</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Unable to sync organization data with the server. The sync server may be unavailable.
            </p>
          </div>
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md space-y-1">
            <p>Organization: <span className="font-mono">{organizations[0].name}</span></p>
            <p>Status: <span className="font-mono">{queryStatus}</span></p>
            <p>Sync attempts: <span className="font-mono">{syncAttempts}</span></p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={handleRetry} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
            <Button asChild variant="secondary">
              <Link to="/dashboard/account">Manage Account</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Orgs exist but Zero hasn't synced yet - show syncing state with progress
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Syncing organization data...</p>
        <p className="text-xs text-muted-foreground mt-1">
          Attempt {syncAttempts + 1}/{MAX_SYNC_ATTEMPTS}
        </p>
      </div>
    </div>
  );
}
