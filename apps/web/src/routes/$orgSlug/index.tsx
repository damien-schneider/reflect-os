import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useZero } from "@rocicorp/zero/react";
import {
  MessageSquare,
  TrendingUp,
  Users,
  Plus,
  ArrowRight,
  Globe,
  Lock,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import { Separator } from "../../components/ui/separator";
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
  const [orgs, { type: orgQueryStatus }] = useQuery(z.query.organization.where("slug", "=", orgSlug));
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
  const handleBoardVisibilityToggle = async (boardId: string, checked: boolean) => {
    await z.mutate.board.update({
      id: boardId,
      isPublic: checked,
      updatedAt: Date.now(),
    });
  };

  // Show loading state while checking membership
  const isLoading = sessionPending || orgQueryStatus !== "complete" || (session && memberQueryStatus !== "complete");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-muted-foreground">Organization not found</p>
        <Button variant="outline" asChild>
          <Link to="/dashboard/account">Go to My Account</Link>
        </Button>
      </div>
    );
  }

  // Public view for non-members
  if (!isMember) {
    return <PublicOrgView org={org} boards={visibleBoards ?? []} orgSlug={orgSlug} />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{org.name}</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {session?.user?.name ?? "there"}!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          icon={<MessageSquare className="h-5 w-5" />}
          label="Boards"
          value={totalBoards}
          href={`/${orgSlug}/admin/boards`}
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
          <h2 className="text-lg font-semibold">Visibility</h2>
          {org.isPublic && publicBoards.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`/${orgSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
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
        <div className="p-4 border rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {org.isPublic ? (
                <div className="p-2 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400">
                  <Globe className="h-5 w-5" />
                </div>
              ) : (
                <div className="p-2 bg-muted rounded-lg text-muted-foreground">
                  <Lock className="h-5 w-5" />
                </div>
              )}
              <div>
                <p className="font-medium">Organization Visibility</p>
                <p className="text-sm text-muted-foreground">
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
                  <Badge variant={publicBoards.length > 0 ? "secondary" : "outline"}>
                    {publicBoards.length} / {boards?.length ?? 0}
                  </Badge>
                </div>
                {boards && boards.length > 0 ? (
                  <div className="space-y-2">
                    {boards.map((board) => (
                      <div
                        key={board.id}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{board.name}</span>
                          {board.isPublic ? (
                            <Badge variant="secondary" className="text-[10px]">
                              <Eye className="h-3 w-3 mr-1" />
                              Public
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              <EyeOff className="h-3 w-3 mr-1" />
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
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No boards yet. Create one to get started.
                  </p>
                )}
              </div>
            </>
          )}

          {!org.isPublic && (
            <p className="text-xs text-muted-foreground">
              Enable organization visibility to allow public access to your boards.
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/$orgSlug/admin/boards" params={{ orgSlug }} search={{ type: "feedback" }}>
              <Plus className="h-4 w-4 mr-2" />
              New Feedback Board
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/$orgSlug/admin/boards" params={{ orgSlug }} search={{ type: "roadmap" }}>
              <Plus className="h-4 w-4 mr-2" />
              New Roadmap
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/$orgSlug/admin/tags" params={{ orgSlug }}>
              Manage Tags
            </Link>
          </Button>
        </div>
      </div>

      {/* Boards List */}
      {boards && boards.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your Boards</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {boards.map((board) => (
              <Link
                key={board.id}
                to="/$orgSlug/$boardSlug"
                params={{ orgSlug, boardSlug: board.slug }}
                className="block p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium">{board.name}</h3>
                    </div>
                    {board.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
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
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No boards yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first feedback board or roadmap to get started.
          </p>
          <Button asChild>
            <Link to="/$orgSlug/admin/boards" params={{ orgSlug }}>
              <Plus className="h-4 w-4 mr-2" />
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
    <div className="flex items-center gap-4 p-4 border rounded-lg">
      <div className="p-2 bg-primary/10 rounded-lg text-primary">{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block hover:bg-accent/50 rounded-lg transition-colors">
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
  boards: readonly { id: string; name: string; slug: string; description?: string | null }[];
  orgSlug: string;
}) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center py-8">
        {org.logo && (
          <img
            src={org.logo}
            alt={org.name}
            className="h-16 w-16 rounded-lg mx-auto mb-4 object-cover"
          />
        )}
        <h1 className="text-3xl font-bold">{org.name}</h1>
        <p className="text-muted-foreground mt-2">
          Share your feedback and help us improve
        </p>
      </div>

      {/* Public Boards */}
      {boards.length > 0 ? (
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Boards
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {boards.map((board) => (
                <Link
                  key={board.id}
                  to="/$orgSlug/$boardSlug"
                  params={{ orgSlug, boardSlug: board.slug }}
                  className="block p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{board.name}</h3>
                      {board.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
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
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No public boards</h3>
          <p className="text-muted-foreground">
            This organization hasn't published any boards yet.
          </p>
        </div>
      )}
    </div>
  );
}
