import { createFileRoute, Outlet, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { authClient } from "../../../lib/auth-client";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Schema } from "../../../schema";

export const Route = createFileRoute("/dashboard/$orgSlug")({
  component: DashboardOrgLayout,
});

function DashboardOrgLayout() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug?: string };
  const z = useZero<Schema>();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);
  const [syncAttempts, setSyncAttempts] = useState(0);

  // Get session info
  const { data: session, isPending: sessionPending } = authClient.useSession();
  
  // Check if user has this org in Better Auth (source of truth for membership)
  const { data: authOrganizations, isPending: authOrgsPending } = authClient.useListOrganizations();
  const authOrg = authOrganizations?.find((o) => o.slug === orgSlug);
  const hasAuthMembership = !!authOrg;

  // Get organization from Zero for real-time updates
  const [orgs, { type: queryStatus }] = useQuery(
    z.query.organization.where("slug", "=", orgSlug ?? "")
  );
  const org = orgs?.[0];

  // Check if user is a member in Zero
  const [members] = useQuery(
    z.query.member
      .where("organizationId", "=", org?.id ?? "")
      .where("userId", "=", session?.user?.id ?? "")
  );
  const isMemberInZero = members && members.length > 0;
  
  // User has access if they're a member according to Better Auth
  // We use Better Auth as source of truth since Zero might be syncing
  const hasAccess = hasAuthMembership;
  
  // Wait for Zero to sync if user has auth membership but Zero hasn't synced yet
  const zeroSynced = org && isMemberInZero;
  const needsSync = hasAuthMembership && !zeroSynced && queryStatus === "complete";

  // Retry sync check periodically if needed
  useEffect(() => {
    if (needsSync && syncAttempts < 20) {
      const timer = setTimeout(() => {
        setSyncAttempts((prev) => prev + 1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [needsSync, syncAttempts]);

  // Redirect if not a member of this org according to Better Auth
  useEffect(() => {
    // Wait for auth queries to complete
    if (sessionPending || authOrgsPending) return;
    
    // Prevent multiple redirects
    if (hasRedirected.current) return;

    // If user doesn't have this org in Better Auth, redirect
    if (!hasAuthMembership) {
      hasRedirected.current = true;
      navigate({ to: "/dashboard", replace: true });
    }
  }, [sessionPending, authOrgsPending, hasAuthMembership, navigate]);

  // Show loading while checking auth
  if (sessionPending || authOrgsPending) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  // Show loading while Zero syncs (only if user has auth access)
  if (hasAccess && (queryStatus !== "complete" || needsSync)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Syncing organization data...</p>
      </div>
    );
  }

  // If user doesn't have access, show nothing while redirecting
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Apply org branding (custom CSS)
  const customCss = org?.customCss;

  return (
    <>
      {/* Inject custom CSS if available */}
      {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
      
      <div className="container mx-auto p-4 md:p-6 max-w-6xl">
        <Outlet />
      </div>
    </>
  );
}
