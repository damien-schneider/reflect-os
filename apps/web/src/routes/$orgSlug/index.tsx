import { useQuery, useZero } from "@rocicorp/zero/react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  ArrowRight,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import { Switch } from "../../components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { authClient } from "../../lib/auth-client";
import type { Schema } from "../../schema";

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

  // Get recent feedback across all visible boards
  const boardIds = visibleBoards?.map((b) => b.id) ?? [];
  const [recentFeedback] = useQuery(
    z.query.feedback
      .where("boardId", "IN", boardIds.length > 0 ? boardIds : [""])
      .orderBy("createdAt", "desc")
      .limit(5)
      .related("author")
      .related("board")
  );

  // Stats - all boards are unified (feedback boards with roadmap view)
  const totalBoards = visibleBoards?.length ?? 0;
  const publicBoards = boards?.filter((b) => b.isPublic) ?? [];
  const totalFeedback = recentFeedback?.length ?? 0;

  // Handle org visibility toggle
  const handleOrgVisibilityToggle = async (checked: boolean) => {
    if (!org) return;
    await z.mutate.organization.update({
      id: org.id,
      isPublic: checked,
    });
  };

  // Handle board visibility toggle
  const handleBoardVisibilityToggle = async (
    boardId: string,
    checked: boolean
  ) => {
    await z.mutate.board.update({
      id: boardId,
      isPublic: checked,
      updatedAt: Date.now(),
    });
  };

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

  // Public view for non-members
  if (!isMember) {
    return (
      <PublicOrgView boards={visibleBoards ?? []} org={org} orgSlug={orgSlug} />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl">{org.name}</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back, {session?.user?.name ?? "there"}!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          href={`/${orgSlug}/admin/boards`}
          icon={<MessageSquare className="h-5 w-5" />}
          label="Boards"
          value={totalBoards}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Total Feedback"
          value={totalFeedback}
        />
      </div>

      {/* Visibility Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Visibility</h2>
          {org.isPublic && publicBoards.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  className="inline-flex items-center gap-1 text-primary text-sm hover:underline"
                  href={`/${orgSlug}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Public Page
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Open public page in new tab</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Organization Visibility Card */}
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {org.isPublic ? (
                <div className="rounded-lg bg-green-500/10 p-2 text-green-600 dark:text-green-400">
                  <Globe className="h-5 w-5" />
                </div>
              ) : (
                <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                  <Lock className="h-5 w-5" />
                </div>
              )}
              <div>
                <p className="font-medium">Organization Visibility</p>
                <p className="text-muted-foreground text-sm">
                  {org.isPublic
                    ? "Your organization is visible to the public"
                    : "Only members can see your organization"}
                </p>
              </div>
            </div>
            <Switch
              checked={org.isPublic ?? false}
              onCheckedChange={handleOrgVisibilityToggle}
            />
          </div>

          {org.isPublic && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Public Boards</span>
                  <Badge
                    variant={publicBoards.length > 0 ? "secondary" : "outline"}
                  >
                    {publicBoards.length} / {boards?.length ?? 0}
                  </Badge>
                </div>
                {boards && boards.length > 0 ? (
                  <div className="space-y-2">
                    {boards.map((board) => (
                      <div
                        className="flex items-center justify-between rounded-md bg-muted/50 p-2"
                        key={board.id}
                      >
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{board.name}</span>
                          {board.isPublic ? (
                            <Badge className="text-[10px]" variant="secondary">
                              <Eye className="mr-1 h-3 w-3" />
                              Public
                            </Badge>
                          ) : (
                            <Badge className="text-[10px]" variant="outline">
                              <EyeOff className="mr-1 h-3 w-3" />
                              Private
                            </Badge>
                          )}
                        </div>
                        <Switch
                          checked={board.isPublic ?? false}
                          onCheckedChange={(checked) =>
                            handleBoardVisibilityToggle(board.id, checked)
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-2 text-center text-muted-foreground text-sm">
                    No boards yet. Create one to get started.
                  </p>
                )}
              </div>
            </>
          )}

          {!org.isPublic && (
            <p className="text-muted-foreground text-xs">
              Enable organization visibility to allow public access to your
              boards.
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="font-semibold text-lg">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link
              params={{ orgSlug }}
              search={{ type: "feedback" }}
              to="/$orgSlug/admin/boards"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Feedback Board
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link
              params={{ orgSlug }}
              search={{ type: "roadmap" }}
              to="/$orgSlug/admin/boards"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Roadmap
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link params={{ orgSlug }} to="/$orgSlug/admin/tags">
              Manage Tags
            </Link>
          </Button>
        </div>
      </div>

      {/* Boards List */}
      {boards && boards.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Your Boards</h2>
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
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium">{board.name}</h3>
                    </div>
                    {board.description && (
                      <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
                        {board.description}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!boards || boards.length === 0) && (
        <div className="rounded-lg border bg-muted/30 py-12 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 font-medium text-lg">No boards yet</h3>
          <p className="mb-4 text-muted-foreground">
            Create your first feedback board or roadmap to get started.
          </p>
          <Button asChild>
            <Link params={{ orgSlug }} to="/$orgSlug/admin/boards">
              <Plus className="mr-2 h-4 w-4" />
              Create Board
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
      <div>
        <p className="font-bold text-2xl">{value}</p>
        <p className="text-muted-foreground text-sm">{label}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        className="block rounded-lg transition-colors hover:bg-accent/50"
        to={href}
      >
        {content}
      </Link>
    );
  }

  return content;
}

// Public view for visitors who are not members of the organization
function PublicOrgView({
  org,
  boards,
  orgSlug,
}: {
  org: { id: string; name: string; logo?: string | null };
  boards: readonly {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
  }[];
  orgSlug: string;
}) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="py-8 text-center">
        {org.logo && (
          <img
            alt={org.name}
            className="mx-auto mb-4 h-16 w-16 rounded-lg object-cover"
            src={org.logo}
          />
        )}
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
                      {board.description && (
                        <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
                          {board.description}
                        </p>
                      )}
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
    </div>
  );
}
