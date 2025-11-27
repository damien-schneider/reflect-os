import { createFileRoute, Outlet, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { authClient } from "../../../lib/auth-client";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Schema } from "../../../schema";

export const Route = createFileRoute("/dashboard/$orgSlug")({
  component: DashboardOrgLayout,
});

function DashboardOrgLayout() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug?: string };
  const z = useZero<Schema>();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  // Get session info
  const { data: session, isPending: sessionPending } = authClient.useSession();

  // Get organization from Zero for real-time updates
  const [orgs, { type: queryStatus }] = useQuery(
    z.query.organization.where("slug", "=", orgSlug ?? "")
  );
  const org = orgs?.[0];

  // Check if user is a member
  const [members] = useQuery(
    z.query.member
      .where("organizationId", "=", org?.id ?? "")
      .where("userId", "=", session?.user?.id ?? "")
  );
  const isMember = members && members.length > 0;

  // Redirect if not a member of this org
  useEffect(() => {
    // Wait for queries to complete
    if (sessionPending || queryStatus !== "complete") return;
    
    // Prevent multiple redirects
    if (hasRedirected.current) return;

    // If org doesn't exist, redirect to dashboard
    if (!org) {
      hasRedirected.current = true;
      navigate({ to: "/dashboard", replace: true });
      return;
    }

    // If user is not a member, redirect to dashboard
    if (!isMember) {
      hasRedirected.current = true;
      navigate({ to: "/dashboard", replace: true });
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

  // If user doesn't have access, show nothing while redirecting
  if (!org || !isMember) {
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
