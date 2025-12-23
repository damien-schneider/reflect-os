import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Separator } from "@repo/ui/components/separator";
import { Switch } from "@repo/ui/components/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Crown,
  Eye,
  EyeOff,
  Layers,
  Lock,
  MessageSquare,
  Plus,
} from "lucide-react";
import { useLimitCheck } from "@/features/subscription";
import { authClient } from "@/lib/auth-client";
import { mutators } from "@/mutators";
import { queries } from "@/queries";
import { randID } from "@/rand";
import type { Board } from "@/schema";

export const Route = createFileRoute("/dashboard/$orgSlug/boards")({
  component: BoardsPage,
});

// Extract BoardCard component to reduce cognitive complexity
function BoardCard({
  board,
  orgSlug,
  onVisibilityToggle,
}: {
  board: Board;
  orgSlug: string;
  onVisibilityToggle: (boardId: string, checked: boolean) => void;
}) {
  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{board.name}</CardTitle>
          </div>
          <Badge variant={board.isPublic ? "default" : "secondary"}>
            {board.isPublic ? (
              <Eye className="mr-1 h-3 w-3" />
            ) : (
              <Lock className="mr-1 h-3 w-3" />
            )}
            {board.isPublic ? "Public" : "Private"}
          </Badge>
        </div>
        {board.description ? (
          <CardDescription className="line-clamp-2">
            {board.description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardFooter className="flex items-center justify-between pt-0">
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="flex items-center gap-1">
                <Switch
                  checked={board.isPublic ?? false}
                  onCheckedChange={(checked) =>
                    onVisibilityToggle(board.id, checked)
                  }
                  size="sm"
                />
                <span className="text-muted-foreground text-xs">
                  {board.isPublic ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                </span>
              </div>
            }
          />
          <TooltipContent>
            {board.isPublic ? "Click to make private" : "Click to make public"}
          </TooltipContent>
        </Tooltip>
        <Link
          className="flex items-center gap-1 text-primary text-sm hover:underline"
          params={{ orgSlug, boardSlug: board.slug }}
          to="/dashboard/$orgSlug/$boardSlug"
        >
          View Board
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardFooter>
    </Card>
  );
}

function BoardsPage() {
  const { orgSlug } = Route.useParams();
  const zero = useZero();
  const navigate = useNavigate();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  // Get organization
  const [orgs, { type: orgQueryStatus }] = useQuery(
    queries.organization.bySlug({ slug: orgSlug })
  );
  const org = orgs?.[0];

  // Get all boards for this org
  const [boards] = useQuery(
    queries.board.byOrganizationId({ organizationId: org?.id ?? "" })
  );

  // Check board limit for subscription
  const boardCount = boards?.length ?? 0;
  const { isLimitReached, max } = useLimitCheck(boardCount, "boards");

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
    if (!org || isLimitReached) {
      return;
    }
    const boardId = randID();
    const slug = `board-${randID()}`;
    zero.mutate(
      mutators.board.insert({
        id: boardId,
        organizationId: org.id,
        name: "Untitled Board",
        slug,
        description: "",
        isPublic: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );
    navigate({
      to: "/dashboard/$orgSlug/$boardSlug",
      params: { orgSlug, boardSlug: slug },
    });
  };

  // Handle loading states
  if (sessionPending || orgQueryStatus === "unknown") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!(session?.user && org)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Organization not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl">Boards</h1>
          <p className="text-muted-foreground text-sm">
            Manage your feedback boards
          </p>
        </div>
        <Button disabled={isLimitReached} onClick={handleCreateBoard}>
          <Plus className="mr-2 h-4 w-4" />
          Create Board
        </Button>
      </div>

      {/* Limit reached warning */}
      {isLimitReached ? (
        <Alert>
          <Crown className="h-4 w-4" />
          <AlertTitle>Board limit reached</AlertTitle>
          <AlertDescription>
            You've reached the maximum of {max} boards on your current plan.{" "}
            <Link
              className="font-medium underline underline-offset-4 hover:text-primary"
              params={{ orgSlug }}
              to="/dashboard/$orgSlug/subscription"
            >
              Upgrade your plan
            </Link>{" "}
            to create more boards.
          </AlertDescription>
        </Alert>
      ) : null}

      <Separator />

      {/* Boards Grid */}
      {boards && boards.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <BoardCard
              board={board}
              key={board.id}
              onVisibilityToggle={handleBoardVisibilityToggle}
              orgSlug={orgSlug}
            />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">No boards yet</h3>
              <p className="text-muted-foreground text-sm">
                Create your first board to start collecting feedback.
              </p>
            </div>
            <Button disabled={isLimitReached} onClick={handleCreateBoard}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Board
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
