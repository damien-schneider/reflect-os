import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { List, Map as MapIcon, Plus } from "lucide-react";
import { AdminFloatingBar } from "@/components/admin-floating-bar";
import { useAuthDialog } from "@/components/auth-dialog-provider";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FeedbackFilters } from "@/features/feedback/components/feedback-filters";
import { FeedbackListItem } from "@/features/feedback/components/feedback-list-item";
import {
  useBoardData,
  useFeedbackData,
  useFeedbackFilters,
  useSession,
} from "@/features/feedback/hooks/use-feedback-filters";
import { RoadmapKanban } from "@/features/roadmap/components/roadmap-kanban";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/$orgSlug/$boardSlug/")({
  component: BoardIndex,
});

type RoadmapFeedbackItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  voteCount: number;
  roadmapLane: string | null;
  roadmapOrder: number;
  completedAt: number | null;
};

function BoardIndex() {
  const { orgSlug, boardSlug } = useParams({ strict: false }) as {
    orgSlug: string;
    boardSlug: string;
  };
  const { data: authOrganizations } = authClient.useListOrganizations();
  const isOrgMember = authOrganizations?.some((o) => o.slug === orgSlug);
  const { openAuthDialog } = useAuthDialog();

  const { viewMode, setViewMode, hasFilters } = useFeedbackFilters();
  const { org, board, tags } = useBoardData();
  const { feedbacks, filteredFeedbacks, pinnedFeedbacks, regularFeedbacks } =
    useFeedbackData();
  const session = useSession();

  const roadmapLaneTags = tags.filter((t) => t.isRoadmapLane);

  const roadmapItems = feedbacks
    .filter((f) => f.roadmapLane)
    .map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      status: f.status ?? "open",
      voteCount: f.voteCount ?? 0,
      roadmapLane: f.roadmapLane,
      roadmapOrder: f.roadmapOrder ?? 0,
      completedAt: f.completedAt ?? null,
    }))
    .sort((a, b) => a.roadmapOrder - b.roadmapOrder) as RoadmapFeedbackItem[];

  return (
    <div className="space-y-6">
      <div className="wrapper-content">
        <BoardHeader
          board={board}
          setViewMode={setViewMode}
          viewMode={viewMode}
        />
      </div>

      {viewMode === "list" ? (
        <ListView
          boardSlug={boardSlug}
          filteredFeedbacks={filteredFeedbacks}
          hasFilters={hasFilters}
          openAuthDialog={openAuthDialog}
          orgSlug={orgSlug}
          pinnedFeedbacks={pinnedFeedbacks}
          regularFeedbacks={regularFeedbacks}
          session={session}
        />
      ) : (
        <RoadmapView
          boardId={board?.id ?? ""}
          organizationId={org?.id}
          roadmapItems={roadmapItems}
          roadmapLaneTags={roadmapLaneTags}
        />
      )}

      {isOrgMember === true ? (
        <div className="wrapper-content">
          <AdminFloatingBar
            dashboardLink={{
              to: "/dashboard/$orgSlug/$boardSlug",
              params: { orgSlug, boardSlug },
            }}
            message="You're viewing the public page"
          />
        </div>
      ) : null}
    </div>
  );
}

type BoardData = {
  name?: string;
  description?: string | null;
};

type SessionData = {
  user?: {
    id: string;
  } | null;
} | null;

function BoardHeader({
  board,
  viewMode,
  setViewMode,
}: {
  board: BoardData | undefined;
  viewMode: "list" | "roadmap";
  setViewMode: (mode: "list" | "roadmap") => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="font-bold text-2xl">{board?.name}</h1>
        {board?.description ? (
          <p className="mt-1 text-muted-foreground">{board.description}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <ToggleGroup
          className="rounded-md border"
          onValueChange={(value) => {
            if (value) {
              setViewMode(value as "list" | "roadmap");
            }
          }}
          type="single"
          value={viewMode}
        >
          <ToggleGroupItem aria-label="List view" className="px-3" value="list">
            <List className="mr-1 h-4 w-4" />
            List
          </ToggleGroupItem>
          <ToggleGroupItem
            aria-label="Roadmap view"
            className="px-3"
            value="roadmap"
          >
            <MapIcon className="mr-1 h-4 w-4" />
            Roadmap
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}

type FeedbackItem = ReturnType<
  typeof useFeedbackData
>["filteredFeedbacks"][number];

type Tag = {
  id: string;
  name: string;
  color: string;
  organizationId: string;
  isDoneStatus: boolean | null;
  isRoadmapLane: boolean | null;
  laneOrder: number | null;
  createdAt: number;
};

function ListView({
  filteredFeedbacks,
  pinnedFeedbacks,
  regularFeedbacks,
  hasFilters,
  session,
  orgSlug,
  boardSlug,
  openAuthDialog,
}: {
  filteredFeedbacks: FeedbackItem[];
  pinnedFeedbacks: FeedbackItem[];
  regularFeedbacks: FeedbackItem[];
  hasFilters: boolean;
  session: SessionData;
  orgSlug: string;
  boardSlug: string;
  openAuthDialog: () => void;
}) {
  return (
    <div className="wrapper-content space-y-6">
      <FeedbackFilters />

      <p className="text-muted-foreground text-sm">
        {filteredFeedbacks.length} feedback item
        {filteredFeedbacks.length !== 1 ? "s" : ""}
      </p>

      <div className="space-y-3">
        {pinnedFeedbacks.map((feedback) => (
          <FeedbackListItem
            boardSlug={boardSlug}
            feedback={feedback}
            key={feedback.id}
            orgSlug={orgSlug}
          />
        ))}

        {regularFeedbacks.map((feedback) => (
          <FeedbackListItem
            boardSlug={boardSlug}
            feedback={feedback}
            key={feedback.id}
            orgSlug={orgSlug}
          />
        ))}

        {filteredFeedbacks.length === 0 ? (
          <EmptyState
            boardSlug={boardSlug}
            hasFilters={hasFilters}
            openAuthDialog={openAuthDialog}
            orgSlug={orgSlug}
            session={session}
          />
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({
  hasFilters,
  session,
  orgSlug,
  boardSlug,
  openAuthDialog,
}: {
  hasFilters: boolean;
  session: SessionData;
  orgSlug: string;
  boardSlug: string;
  openAuthDialog: () => void;
}) {
  const renderButton = () => {
    if (session !== null) {
      return (
        <Button asChild>
          <Link params={{ orgSlug, boardSlug }} to="/$orgSlug/$boardSlug/new">
            <Plus className="mr-2 h-4 w-4" />
            Submit Feedback
          </Link>
        </Button>
      );
    }
    if (hasFilters) {
      return null;
    }
    return (
      <Button onClick={openAuthDialog} variant="outline">
        Sign In to Submit Feedback
      </Button>
    );
  };

  return (
    <div className="rounded-lg border bg-muted/30 py-12 text-center">
      <p className="mb-4 text-muted-foreground">
        {hasFilters
          ? "No feedback matches your filters"
          : "No feedback yet. Be the first to share your ideas!"}
      </p>
      {renderButton()}
    </div>
  );
}

function RoadmapView({
  boardId,
  organizationId,
  roadmapLaneTags,
  roadmapItems,
}: {
  boardId: string;
  organizationId: string | undefined;
  roadmapLaneTags: Tag[];
  roadmapItems: RoadmapFeedbackItem[];
}) {
  return (
    <div className="wrapper-content space-y-6">
      <RoadmapKanban
        boardId={boardId}
        customLanes={roadmapLaneTags.length > 0 ? roadmapLaneTags : undefined}
        isAdmin={false}
        items={roadmapItems}
        organizationId={organizationId}
      />

      {roadmapItems.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 py-12 text-center">
          <p className="text-muted-foreground">No items on the roadmap yet.</p>
        </div>
      ) : null}
    </div>
  );
}
