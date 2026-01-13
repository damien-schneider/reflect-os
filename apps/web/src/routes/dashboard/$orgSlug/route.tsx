import { ScrollArea } from "@repo/ui/components/scroll-area";
import { useQuery } from "@rocicorp/zero/react";
import {
  createFileRoute,
  Outlet,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { queries } from "@/queries";

export const Route = createFileRoute("/dashboard/$orgSlug")({
  component: DashboardOrgLayout,
});

function DashboardOrgLayout() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug?: string };
  const navigate = useNavigate();
  const hasRedirected = useRef(false);
  const [syncAttempts, setSyncAttempts] = useState(0);

  // Get session info
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userId = session?.user?.id ?? "";

  // Check if user has this org in Better Auth (source of truth for membership)
  const { data: authOrganizations, isPending: authOrgsPending } =
    authClient.useListOrganizations();
  const authOrg = authOrganizations?.find((o) => o.slug === orgSlug);
  const hasAuthMembership = !!authOrg;
  const authOrgId = authOrg?.id ?? "";

  // Query Zero member table first - it has simpler permissions (allowIfLoggedIn)
  // This lets us detect sync status even for private organizations
  const [members, { type: memberQueryStatus }] = useQuery(
    queries.member.checkMembership({ userId, organizationId: authOrgId })
  );
  const isMemberInZero = members && members.length > 0;

  // Get organization from Zero for real-time updates (will only work after member syncs)
  const [orgs] = useQuery(queries.organization.bySlug({ slug: orgSlug ?? "" }));
  const org = orgs?.[0];

  // User has access if they're a member according to Better Auth
  // We use Better Auth as source of truth since Zero might be syncing
  const hasAccess = hasAuthMembership;

  // Wait for Zero to sync if user has auth membership but member hasn't synced yet
  // Use member sync status as primary indicator since it has simpler permissions
  const needsSync =
    hasAuthMembership && !isMemberInZero && memberQueryStatus === "complete";

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
    if (sessionPending || authOrgsPending) {
      return;
    }

    // Prevent multiple redirects
    if (hasRedirected.current) {
      return;
    }

    // If user doesn't have this org in Better Auth, redirect
    if (!hasAuthMembership) {
      hasRedirected.current = true;
      navigate({ to: "/dashboard", replace: true });
    }
  }, [sessionPending, authOrgsPending, hasAuthMembership, navigate]);

  // Show loading while checking auth
  if (sessionPending || authOrgsPending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show loading while Zero syncs (only if user has auth access)
  // Use memberQueryStatus since that's what we're using to detect sync
  if (hasAccess && (memberQueryStatus !== "complete" || needsSync)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          Syncing organization data...
        </p>
      </div>
    );
  }

  // If user doesn't have access, show nothing while redirecting
  if (!hasAccess) {
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

      <ScrollArea className="h-full">
        <div className="min-w-0 p-4 md:p-6">
          <Outlet />
        </div>
      </ScrollArea>
    </>
  );
}
