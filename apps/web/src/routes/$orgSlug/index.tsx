import { useQuery, useZero } from "@rocicorp/zero/react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowRight, Globe, Loader2, MessageSquare } from "lucide-react";
import { AdminFloatingBar } from "@/components/admin-floating-bar";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import type { Schema } from "@/schema";

export const Route = createFileRoute("/$orgSlug/")({
  component: OrgDashboard,
});

function OrgDashboard() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string };
  const z = useZero<Schema>();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  // Get organization
  const [orgs, { type: orgQueryStatus }] = useQuery(
    z.query.organization.where("slug", "=", orgSlug)
  );
  const org = orgs?.[0];

  // Check if user is a member
  const [members, { type: memberQueryStatus }] = useQuery(
    z.query.member
      .where("organizationId", "=", org?.id ?? "")
      .where("userId", "=", session?.user?.id ?? "")
  );
  const isMember = members && members.length > 0;

  // Get boards for this org (public boards for non-members, all boards for members)
  const [boards] = useQuery(
    z.query.board.where("organizationId", "=", org?.id ?? "")
  );

  // Filter boards based on membership - non-members only see public boards
  const visibleBoards = isMember ? boards : boards?.filter((b) => b.isPublic);

  // Show loading state while checking membership
  const isLoading =
    sessionPending ||
    orgQueryStatus !== "complete" ||
    (session && memberQueryStatus !== "complete");

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Organization not found</p>
        <Button asChild variant="outline">
          <Link to="/dashboard/account">Go to My Account</Link>
        </Button>
      </div>
    );
  }

  // Always show public view at this route (/$orgSlug)
  // Members who want to manage the org should use /dashboard/$orgSlug
  return (
    <PublicOrgView
      boards={visibleBoards ?? []}
      isOrgMember={isMember}
      org={org}
      orgSlug={orgSlug}
    />
  );
}

// Public view for visitors and members viewing the public page
function PublicOrgView({
  org,
  boards,
  orgSlug,
  isOrgMember,
}: {
  org: { id: string; name: string; logo?: string | null };
  boards: readonly {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
  }[];
  orgSlug: string;
  isOrgMember: boolean;
}) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="py-8 text-center">
        {org.logo ? (
          <img
            alt={org.name}
            className="mx-auto mb-4 h-16 w-16 rounded-lg object-cover"
            height={64}
            src={org.logo}
            width={64}
          />
        ) : null}
        <h1 className="font-bold text-3xl">{org.name}</h1>
        <p className="mt-2 text-muted-foreground">
          Share your feedback and help us improve
        </p>
      </div>

      {/* Public Boards */}
      {boards.length > 0 ? (
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 font-semibold text-lg">
              <MessageSquare className="h-5 w-5" />
              Boards
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {boards.map((board) => (
                <Link
                  className="block rounded-lg border p-4 transition-colors hover:bg-accent/50"
                  key={board.id}
                  params={{ orgSlug, boardSlug: board.slug }}
                  to="/$orgSlug/$boardSlug"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{board.name}</h3>
                      {board.description ? (
                        <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
                          {board.description}
                        </p>
                      ) : null}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/30 py-12 text-center">
          <Globe className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 font-medium text-lg">No public boards</h3>
          <p className="text-muted-foreground">
            This organization hasn't published any boards yet.
          </p>
        </div>
      )}

      {/* Admin floating bar for org members viewing public page */}
      {isOrgMember === true ? (
        <AdminFloatingBar
          dashboardLink={{
            to: "/dashboard/$orgSlug",
            params: { orgSlug },
          }}
          message="You're viewing the public page"
        />
      ) : null}
    </div>
  );
}
