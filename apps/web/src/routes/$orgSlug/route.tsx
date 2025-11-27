import { createFileRoute, Outlet, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { authClient } from "../../lib/auth-client";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import type { Schema } from "../../schema";

export const Route = createFileRoute("/$orgSlug")({
  component: OrgLayout,
});

function OrgLayout() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug?: string };
  const z = useZero<Schema>();
  const navigate = useNavigate();

  // Get session info
  const { data: session, isPending: sessionPending } = authClient.useSession();

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

  // Redirect to login if:
  // - Organization is not public AND
  // - User is not logged in OR user is not a member
  useEffect(() => {
    // Wait for queries to complete
    if (sessionPending || queryStatus !== "complete") return;

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
  }, [org, session, sessionPending, isMember, queryStatus, navigate]);

  // Show loading while checking access
  if (sessionPending || queryStatus !== "complete") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If org is private and user doesn't have access, show nothing while redirecting
  if (org && !org.isPublic && (!session || !isMember)) {
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
