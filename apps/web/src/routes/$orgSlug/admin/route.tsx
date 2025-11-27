import { createFileRoute, Link, Outlet, useParams } from "@tanstack/react-router";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { ArrowLeft, LayoutGrid, Tags, Users, Settings } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import { authClient } from "../../../lib/auth-client";
import type { Schema } from "../../../schema";

export const Route = createFileRoute("/$orgSlug/admin")({
  component: AdminLayout,
});

const adminNavItems = [
  { href: "boards", label: "Boards", icon: LayoutGrid },
  { href: "tags", label: "Tags", icon: Tags },
  { href: "users", label: "Users", icon: Users },
  { href: "settings", label: "Settings", icon: Settings },
];

function AdminLayout() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string };
  const z = useZero<Schema>();
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  // Get organization
  const [orgs, orgsResult] = useQuery(z.query.organization.where("slug", "=", orgSlug));
  const org = orgs?.[0];

  // Check if user is admin/owner
  const [members, membersResult] = useQuery(
    z.query.member
      .where("organizationId", "=", org?.id ?? "")
      .where("userId", "=", session?.user?.id ?? "")
  );
  const memberRole = members?.[0]?.role;
  const isAdmin = memberRole === "admin" || memberRole === "owner";

  // Show loading state while data is being fetched
  const isLoading = isSessionPending || orgsResult.type !== 'complete' || membersResult.type !== 'complete';

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-muted-foreground">
          You don't have permission to access this area.
        </p>
        <Button asChild variant="outline">
          <Link to="/$orgSlug" params={{ orgSlug }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <Link
            to="/$orgSlug"
            params={{ orgSlug }}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">{org?.name}</p>
          </div>
        </div>
      </div>

      {/* Admin Navigation */}
      <nav className="flex gap-2 border-b pb-2 overflow-x-auto">
        {adminNavItems.map((item) => (
          <Link
            key={item.href}
            to={"/$orgSlug/admin/" + item.href as "/$orgSlug/admin/boards"}
            params={{ orgSlug }}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "whitespace-nowrap"
            )}
            activeProps={{
              className: "bg-accent text-accent-foreground",
            }}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Admin Content */}
      <Outlet />
    </div>
  );
}
