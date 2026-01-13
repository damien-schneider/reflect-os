import { Button } from "@repo/ui/components/button";
import { useQuery } from "@rocicorp/zero/react";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { queries } from "@/queries";

export const Route = createFileRoute("/$orgSlug")({
  component: OrgLayout,
});

// Maximum time to wait for Zero sync before showing error (in ms)
const SYNC_TIMEOUT_MS = 15_000;
// Maximum number of sync retry attempts
const MAX_SYNC_ATTEMPTS = 30;

function OrgLayout() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug?: string };
  const navigate = useNavigate();
  const [syncAttempts, setSyncAttempts] = useState(0);
  const [syncTimedOut, setSyncTimedOut] = useState(false);
  const syncStartTimeRef = useRef<number | null>(null);

  // Get session info
  const {
    data: session,
    isPending: sessionPending,
    error: sessionError,
  } = authClient.useSession();
  const userId = session?.user?.id ?? "";

  // Check if user has this org in Better Auth
  const {
    data: authOrganizations,
    isPending: authOrgsPending,
    error: authOrgsError,
  } = authClient.useListOrganizations();
  const authOrg = authOrganizations?.find((o) => o.slug === orgSlug);
  const hasAuthMembership = !!authOrg;
  const authOrgId = authOrg?.id ?? "";

  // Query Zero member table first - it has simpler permissions (allowIfLoggedIn)
  // This lets us detect sync status even for private organizations
  const [members, { type: memberQueryStatus }] = useQuery(
    queries.member.checkMembership({ userId, organizationId: authOrgId })
  );
  const isMember = members && members.length > 0;

  // Get organization from Zero for real-time updates (will only work after member syncs)
  const [orgs, { type: queryStatus }] = useQuery(
    queries.organization.bySlug({ slug: orgSlug ?? "" })
  );
  const org = orgs?.[0];

  // Wait for Zero sync if user has auth membership but member hasn't synced yet
  // Use member sync status as primary indicator since it has simpler permissions
  const needsSync =
    hasAuthMembership && !isMember && memberQueryStatus === "complete";

  // Initialize sync start time when needsSync becomes true
  useEffect(() => {
    if (needsSync && syncStartTimeRef.current === null) {
      syncStartTimeRef.current = Date.now();
    }
  }, [needsSync]);

  // Log sync status for debugging
  useEffect(() => {
    const elapsed = syncStartTimeRef.current
      ? Date.now() - syncStartTimeRef.current
      : 0;
    console.log("[OrgLayout] Sync status:", {
      orgSlug,
      sessionPending,
      sessionError: sessionError?.message,
      authOrgsPending,
      authOrgsError: authOrgsError?.message,
      hasAuthMembership,
      authOrgId,
      userId,
      memberQueryStatus,
      membersCount: members?.length ?? 0,
      isMember,
      queryStatus,
      orgFound: !!org,
      needsSync,
      syncAttempts,
      syncTimedOut,
      elapsedMs: elapsed,
    });
  }, [
    orgSlug,
    sessionPending,
    sessionError,
    authOrgsPending,
    authOrgsError,
    hasAuthMembership,
    authOrgId,
    userId,
    memberQueryStatus,
    members,
    isMember,
    queryStatus,
    org,
    needsSync,
    syncAttempts,
    syncTimedOut,
  ]);

  // Retry sync check periodically if needed, and check for timeout
  useEffect(() => {
    if (needsSync && syncAttempts < MAX_SYNC_ATTEMPTS && !syncTimedOut) {
      const timer = setTimeout(() => {
        // Check for timeout
        if (syncStartTimeRef.current !== null) {
          const elapsed = Date.now() - syncStartTimeRef.current;
          if (elapsed >= SYNC_TIMEOUT_MS) {
            console.error(
              "[OrgLayout] ❌ Zero sync timed out after",
              elapsed,
              "ms"
            );
            setSyncTimedOut(true);
            return;
          }
        }
        // Increment retry counter
        setSyncAttempts((prev) => prev + 1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [needsSync, syncAttempts, syncTimedOut]);

  // Redirect to login if:
  // - Organization is not public AND
  // - User is not logged in OR user is not a member
  useEffect(() => {
    // Wait for queries to complete
    // For members, use memberQueryStatus; for public orgs, we need org query
    // Only wait for authOrgsPending if user is logged in
    if (sessionPending || (session && authOrgsPending)) {
      return;
    }

    // If user has auth membership, they have access (Zero might just be syncing)
    if (hasAuthMembership) {
      return;
    }

    // Still waiting for Zero sync (for members)
    if (needsSync && syncAttempts < MAX_SYNC_ATTEMPTS && !syncTimedOut) {
      return;
    }

    // Wait for org query to complete (for non-members accessing public orgs)
    if (queryStatus !== "complete") {
      return;
    }

    // If org doesn't exist, let the child route handle the 404
    if (!org) {
      return;
    }

    // If org is public, allow access
    if (org.isPublic) {
      return;
    }

    // If user is not logged in, redirect to login
    if (!session) {
      console.log("[OrgLayout] Redirecting to login - not logged in");
      navigate({ to: "/login" });
      return;
    }

    // If user is logged in but not a member, redirect to account
    if (!isMember) {
      console.log("[OrgLayout] Redirecting to account - not a member");
      navigate({ to: "/dashboard/account" });
    }
  }, [
    org,
    session,
    sessionPending,
    authOrgsPending,
    isMember,
    hasAuthMembership,
    queryStatus,
    navigate,
    needsSync,
    syncAttempts,
    syncTimedOut,
  ]);

  // Handle retry
  const handleRetry = () => {
    console.log("[OrgLayout] Retrying sync...");
    setSyncAttempts(0);
    setSyncTimedOut(false);
    window.location.reload();
  };

  // Auth error state - only show for session errors when user is logged in
  // Don't show auth errors for unauthenticated users trying to access public orgs
  // authOrgsError is expected when user is not logged in
  const authError = sessionError;
  if (authError) {
    console.error("[OrgLayout] ❌ Auth error:", authError);
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8">
        <div className="max-w-md space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Authentication Error</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Unable to verify your access to this organization.
            </p>
          </div>
          <p className="rounded-md bg-destructive/10 p-3 font-mono text-destructive text-xs">
            {authError.message}
          </p>
          <Button className="gap-2" onClick={handleRetry} variant="outline">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Sync timed out - show error state
  if (syncTimedOut && hasAuthMembership) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8">
        <div className="max-w-md space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Sync Timeout</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Unable to sync organization data with the server. The sync server
              may be unavailable.
            </p>
          </div>
          <div className="space-y-1 rounded-md bg-muted p-3 text-muted-foreground text-xs">
            <p>
              Organization:{" "}
              <span className="font-mono">{authOrg?.name ?? orgSlug}</span>
            </p>
            <p>
              Member sync:{" "}
              <span className="font-mono">{memberQueryStatus}</span>
            </p>
            <p>
              Org sync: <span className="font-mono">{queryStatus}</span>
            </p>
            <p>
              Sync attempts: <span className="font-mono">{syncAttempts}</span>
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <Button className="gap-2" onClick={handleRetry} variant="outline">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
            <Button
              render={<Link to="/dashboard/account" />}
              variant="secondary"
            >
              Manage Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while checking access or waiting for Zero sync
  // For members: wait for member sync. For public orgs: wait for org query
  // Don't wait for authOrgsPending if user is not logged in (no session)
  const isLoading =
    sessionPending ||
    (session && authOrgsPending) ||
    (hasAuthMembership && (memberQueryStatus !== "complete" || needsSync)) ||
    (!hasAuthMembership && queryStatus !== "complete");

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        {needsSync && (
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              Syncing organization data...
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              Attempt {syncAttempts + 1}/{MAX_SYNC_ATTEMPTS}
            </p>
          </div>
        )}
      </div>
    );
  }

  // If org is private and user doesn't have access, show nothing while redirecting
  if (org && !org.isPublic && !hasAuthMembership && !(session && isMember)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Apply org branding (custom CSS)
  const customCss = org?.customCss;

  return (
    <>
      {/* Inject custom CSS if available */}
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: admin-controlled CSS */}
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}

      <div className="p-4 md:p-6">
        <Outlet />
      </div>
    </>
  );
}
