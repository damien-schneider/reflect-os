import { createFileRoute, Outlet, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { authClient } from "../../lib/auth-client";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Schema } from "../../schema";

export const Route = createFileRoute("/$orgSlug")({
  component: OrgLayout,
});

function OrgLayout() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug?: string };
  const z = useZero<Schema>();
  const navigate = useNavigate();
  const [syncAttempts, setSyncAttempts] = useState(0);

  // Get session info
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userId = session?.user?.id ?? "";
  
  // Check if user has this org in Better Auth
  const { data: authOrganizations, isPending: authOrgsPending } = authClient.useListOrganizations();
  const authOrg = authOrganizations?.find((o) => o.slug === orgSlug);
  const hasAuthMembership = !!authOrg;
  const authOrgId = authOrg?.id ?? "";

  // Query Zero member table first - it has simpler permissions (allowIfLoggedIn)
  // This lets us detect sync status even for private organizations
  const [members, { type: memberQueryStatus }] = useQuery(
    z.query.member
      .where("organizationId", "=", authOrgId)
      .where("userId", "=", userId)
  );
  const isMember = members && members.length > 0;

  // Get organization from Zero for real-time updates (will only work after member syncs)
  const [orgs, { type: queryStatus }] = useQuery(
    z.query.organization.where("slug", "=", orgSlug ?? "")
  );
  const org = orgs?.[0];
  
  // Wait for Zero sync if user has auth membership but member hasn't synced yet
  // Use member sync status as primary indicator since it has simpler permissions
  const needsSync = hasAuthMembership && !isMember && memberQueryStatus === "complete";

  // Retry sync check periodically if needed
  useEffect(() => {
    if (needsSync && syncAttempts < 20) {
      const timer = setTimeout(() => {
        setSyncAttempts((prev) => prev + 1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [needsSync, syncAttempts]);

  // Redirect to login if:
  // - Organization is not public AND
  // - User is not logged in OR user is not a member
  useEffect(() => {
    // Wait for queries to complete
    // For members, use memberQueryStatus; for public orgs, we need org query
    if (sessionPending || authOrgsPending) return;
    
    // If user has auth membership, they have access (Zero might just be syncing)
    if (hasAuthMembership) return;
    
    // Still waiting for Zero sync (for members)
    if (needsSync && syncAttempts < 20) return;
    
    // Wait for org query to complete (for non-members accessing public orgs)
    if (queryStatus !== "complete") return;

    // If org doesn't exist, let the child route handle the 404
    if (!org) return;

    // If org is public, allow access
    if (org.isPublic) return;

    // If user is not logged in, redirect to login
    if (!session) {
      navigate({ to: "/login" });
      return;
    }

    // If user is logged in but not a member, redirect to account
    if (!isMember) {
      navigate({ to: "/dashboard/account" });
    }
  }, [org, session, sessionPending, authOrgsPending, isMember, hasAuthMembership, queryStatus, navigate, needsSync, syncAttempts]);

  // Show loading while checking access or waiting for Zero sync
  // For members: wait for member sync. For public orgs: wait for org query
  const isLoading = sessionPending || authOrgsPending || 
    (hasAuthMembership && (memberQueryStatus !== "complete" || needsSync)) ||
    (!hasAuthMembership && queryStatus !== "complete");
    
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If org is private and user doesn't have access, show nothing while redirecting
  if (org && !org.isPublic && !hasAuthMembership && (!session || !isMember)) {
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
