import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useZero } from "@rocicorp/zero/react";
import {
  MessageSquare,
  TrendingUp,
  Plus,
  ArrowRight,
  Globe,
  Lock,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Layers,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Switch } from "../../../components/ui/switch";
import { Separator } from "../../../components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import { authClient } from "../../../lib/auth-client";
import type { Schema } from "../../../schema";

export const Route = createFileRoute("/dashboard/$orgSlug/")({
  component: DashboardOrgIndex,
});

function DashboardOrgIndex() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string };
  const z = useZero<Schema>();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  // Get organization
  const [orgs, { type: orgQueryStatus }] = useQuery(z.query.organization.where("slug", "=", orgSlug));
  const org = orgs?.[0];

  // Get all boards for this org
  const [boards] = useQuery(
    z.query.board.where("organizationId", "=", org?.id ?? "")
  );

  // Get recent feedback across all boards
  const boardIds = boards?.map((b) => b.id) ?? [];
  const [recentFeedback] = useQuery(
    z.query.feedback
      .where("boardId", "IN", boardIds.length > 0 ? boardIds : [""])
      .orderBy("createdAt", "desc")
      .limit(5)
      .related("author")
      .related("board")
  );

  // Stats
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

  // Show loading state
  const isLoading = sessionPending || orgQueryStatus !== "complete";

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
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{org.name}</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {session?.user?.name ?? "there"}!
          </p>
        </div>
        {org.isPublic && publicBoards.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" asChild>
                <a
                  href={`/${orgSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Live Page
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Open public page in new tab</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<Layers className="h-5 w-5" />}
          label="Total Boards"
          value={boards?.length ?? 0}
        />
        <StatCard
          icon={<Globe className="h-5 w-5" />}
          label="Public Boards"
          value={publicBoards.length}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Recent Feedback"
          value={totalFeedback}
        />
      </div>

      {/* Visibility Controls */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Visibility</h2>

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
            <Link to="/dashboard/$orgSlug/boards" params={{ orgSlug }}>
              <Plus className="h-4 w-4 mr-2" />
              New Board
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard/$orgSlug/tags" params={{ orgSlug }}>
              Manage Tags
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard/$orgSlug/users" params={{ orgSlug }}>
              Manage Users
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
                to="/dashboard/$orgSlug/$boardSlug"
                params={{ orgSlug, boardSlug: board.slug }}
                className="block p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium">{board.name}</h3>
                      {!board.isPublic && (
                        <Badge variant="outline" className="text-[10px]">
                          Private
                        </Badge>
                      )}
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
          <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No boards yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first board to start collecting feedback.
          </p>
          <Button asChild>
            <Link to="/dashboard/$orgSlug/boards" params={{ orgSlug }}>
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
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg">
      <div className="p-2 bg-primary/10 rounded-lg text-primary">{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
