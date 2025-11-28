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
  
  // Check if user has this org in Better Auth
  const { data: authOrganizations, isPending: authOrgsPending } = authClient.useListOrganizations();
  const authOrg = authOrganizations?.find((o) => o.slug === orgSlug);
  const hasAuthMembership = !!authOrg;

  // Get organization from Zero for real-time updates
  const [orgs, { type: queryStatus }] = useQuery(
    z.query.organization.where("slug", "=", orgSlug ?? "")
  );
  const org = orgs?.[0];

  // Check if user is a member (for private features)
  const [members] = useQuery(
    z.query.member
      .where("organizationId", "=", org?.id ?? "")
      .where("userId", "=", session?.user?.id ?? "")
  );
  const isMember = members && members.length > 0;
  
  // Wait for Zero sync if user has auth membership but Zero hasn't synced
  const needsSync = hasAuthMembership && !org && queryStatus === "complete";

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
    if (sessionPending || authOrgsPending || queryStatus !== "complete") return;
    
    // If user has auth membership, they have access (Zero might just be syncing)
    if (hasAuthMembership) return;
    
    // Still waiting for Zero sync
    if (needsSync && syncAttempts < 20) return;

    // If org doesn't exist, let the child route handle the 404
    if (!org) return;

    // If org is public, allow access
    if (org.isPublic) return;

    // If user is not logged in, redirect to login
    if (!session) {
      navigate({ to: "/login" });
      return;
    }

    // If user is logged in but not a member, redirect to my-account
    if (!isMember) {
      navigate({ to: "/my-account" });
    }
  }, [org, session, sessionPending, authOrgsPending, isMember, hasAuthMembership, queryStatus, navigate, needsSync, syncAttempts]);

  // Show loading while checking access or waiting for Zero sync
  if (sessionPending || authOrgsPending || queryStatus !== "complete" || needsSync) {
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
