import { useQuery, useZero } from "@rocicorp/zero/react";
import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import {
  ArrowRight,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Layers,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";
import { mutators } from "@/mutators";
import { randID } from "@/rand";
import { zql } from "@/zero-schema";

export const Route = createFileRoute("/dashboard/$orgSlug/")({
  component: DashboardOrgIndex,
});

function DashboardOrgIndex() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string };
  const zero = useZero();
  const navigate = useNavigate();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  // Get organization
  const [orgs, { type: orgQueryStatus }] = useQuery(
    zql.organization.where("slug", orgSlug)
  );
  const org = orgs?.[0];

  // Get all boards for this org
  const [boards] = useQuery(zql.board.where("organizationId", org?.id ?? ""));

  // Get recent feedback across all boards
  const boardIds = boards?.map((b) => b.id) ?? [];
  const [recentFeedback] = useQuery(
    zql.feedback
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
    if (!org) {
      return;
    }
    await zero.mutate(
      mutators.organization.update({
        id: org.id,
        isPublic: checked,
      })
    );
  };

  // Handle board visibility toggle
  const handleBoardVisibilityToggle = async (
    boardId: string,
    checked: boolean
  ) => {
    await zero.mutate(
      mutators.board.update({
        id: boardId,
        isPublic: checked,
        updatedAt: Date.now(),
      })
    );
  };

  // Create a new board and navigate to it
  const handleCreateBoard = () => {
    if (!org) {
      return;
    }
    const boardId = randID();
    const slug = `board-${randID()}`;
    zero.mutate(
      mutators.board.insert({
        id: boardId,
        name: "Untitled Board",
        slug,
        description: "",
        isPublic: false,
        organizationId: org.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );
    navigate({
      to: "/dashboard/$orgSlug/$boardSlug",
      params: { orgSlug, boardSlug: slug },
    });
  };

  // Show loading state
  const isLoading = sessionPending || orgQueryStatus !== "complete";

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
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="wrapper-content space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">{org.name}</h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back, {session?.user?.name ?? "there"}!
          </p>
        </div>
        {org.isPublic && publicBoards.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="outline">
                <a
                  className="inline-flex items-center gap-2"
                  href={`/${orgSlug}`}
                  rel="noopener noreferrer"
                  target="_blank"
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
        <h2 className="font-semibold text-lg">Visibility</h2>

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
          <Button onClick={handleCreateBoard}>
            <Plus className="mr-2 h-4 w-4" />
            New Board
          </Button>
          <Button asChild variant="outline">
            <Link params={{ orgSlug }} to="/dashboard/$orgSlug/tags">
              Manage Tags
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link params={{ orgSlug }} to="/dashboard/$orgSlug/users">
              Manage Users
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
                to="/dashboard/$orgSlug/$boardSlug"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium">{board.name}</h3>
                      {!board.isPublic && (
                        <Badge className="text-[10px]" variant="outline">
                          Private
                        </Badge>
                      )}
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
          <Layers className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 font-medium text-lg">No boards yet</h3>
          <p className="mb-4 text-muted-foreground">
            Create your first board to start collecting feedback.
          </p>
          <Button onClick={handleCreateBoard}>
            <Plus className="mr-2 h-4 w-4" />
            Create Board
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
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
      <div>
        <p className="font-bold text-2xl">{value}</p>
        <p className="text-muted-foreground text-sm">{label}</p>
      </div>
    </div>
  );
}
