import { useZero } from "@rocicorp/zero/react";
import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import {
  ArrowLeft,
  ExternalLink,
  Lightbulb,
  List,
  Map as MapIcon,
  Pencil,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { EditableTitle } from "@/components/editable-title";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BoardActions } from "@/features/board/components/board-actions";
import { SlugEditDialog } from "@/features/board/components/slug-edit-dialog";
import { FeedbackFilters } from "@/features/feedback/components/feedback-filters";
import { FeedbackListItem } from "@/features/feedback/components/feedback-list-item";
import {
  useBoardData,
  useFeedbackData,
  useFeedbackFilters,
} from "@/features/feedback/hooks/use-feedback-filters";
import { RoadmapKanban } from "@/features/roadmap/components/roadmap-kanban";
import type { Schema } from "@/schema";

export const Route = createFileRoute("/dashboard/$orgSlug/$boardSlug/")({
  component: DashboardBoardIndex,
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

type FeedbackForRoadmap = {
  id: string;
  title: string;
  description: string;
  status?: string | null;
  voteCount?: number | null;
  roadmapLane?: string | null;
  roadmapOrder?: number | null;
  completedAt?: number | null;
};

function toRoadmapItem(f: FeedbackForRoadmap): RoadmapFeedbackItem {
  return {
    id: f.id,
    title: f.title,
    description: f.description,
    status: f.status ?? "open",
    voteCount: f.voteCount ?? 0,
    roadmapLane: f.roadmapLane ?? null,
    roadmapOrder: f.roadmapOrder ?? 0,
    completedAt: f.completedAt ?? null,
  };
}

function DashboardBoardIndex() {
  const { orgSlug, boardSlug } = useParams({ strict: false }) as {
    orgSlug: string;
    boardSlug: string;
  };
  const z = useZero<Schema>();
  const navigate = useNavigate();

  // Slug edit dialog state
  const [showSlugDialog, setShowSlugDialog] = useState(false);

  // Use shared hooks for filters and data
  const { viewMode, setViewMode, hasFilters } = useFeedbackFilters();
  const { org, board, tags } = useBoardData();
  const { feedbacks, filteredFeedbacks, pinnedFeedbacks, regularFeedbacks } =
    useFeedbackData({ includeUnapproved: true });

  // Derive roadmap data
  const roadmapLaneTags = tags.filter((t) => t.isRoadmapLane);
  const roadmapItems = feedbacks
    .filter((f) => f.roadmapLane)
    .map(toRoadmapItem)
    .sort((a, b) => a.roadmapOrder - b.roadmapOrder);
  const backlogItems = feedbacks
    .filter((f) => !f.roadmapLane)
    .map(toRoadmapItem);

  // Check if this is a newly created board (has default name)
  const isNewBoard = board?.name === "Untitled Board";

  return (
    <div className="space-y-6">
      {isNewBoard === true && <NewBoardBanner />}

      <DashboardBoardHeader
        board={board}
        onSlugClick={() => setShowSlugDialog(true)}
        onTitleSave={(newName) => {
          if (board) {
            z.mutate.board.update({ id: board.id, name: newName });
          }
        }}
        org={org}
        orgSlug={orgSlug}
        setViewMode={setViewMode}
        viewMode={viewMode}
      />

      {viewMode === "list" ? (
        <DashboardListView
          boardSlug={boardSlug}
          filteredFeedbacks={filteredFeedbacks}
          hasFilters={hasFilters}
          orgSlug={orgSlug}
          pinnedFeedbacks={pinnedFeedbacks}
          regularFeedbacks={regularFeedbacks}
        />
      ) : (
        <DashboardRoadmapView
          backlogItems={backlogItems}
          board={board}
          org={org}
          roadmapItems={roadmapItems}
          roadmapLaneTags={roadmapLaneTags}
        />
      )}

      {board !== undefined && (
        <SlugEditDialog
          currentSlug={board.slug}
          onOpenChange={setShowSlugDialog}
          onSave={(newSlug) => {
            z.mutate.board.update({ id: board.id, slug: newSlug });
            navigate({
              to: "/dashboard/$orgSlug/$boardSlug",
              params: { orgSlug, boardSlug: newSlug },
              replace: true,
            });
          }}
          open={showSlugDialog}
          orgSlug={orgSlug}
        />
      )}
    </div>
  );
}

function NewBoardBanner() {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Lightbulb className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium">Welcome to your new board!</h3>
          <p className="mt-1 text-muted-foreground text-sm">
            Get started by customizing your board:
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-muted-foreground" />
              <span>Click the title above to rename your board</span>
            </li>
            <li className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span>Use the menu (⋮) to edit description and visibility</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

type BoardType = {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
  description: string | null;
  isPublic: boolean | null;
  settings: {
    allowAnonymousVoting?: boolean;
    requireApproval?: boolean;
    defaultStatus?: string;
  } | null;
  createdAt: number;
  updatedAt: number;
};

type OrgType = {
  id: string;
  isPublic?: boolean | null;
};

function DashboardBoardHeader({
  board,
  org,
  orgSlug,
  viewMode,
  setViewMode,
  onTitleSave,
  onSlugClick,
}: {
  board: BoardType | undefined;
  org: OrgType | undefined;
  orgSlug: string;
  viewMode: "list" | "roadmap";
  setViewMode: (mode: "list" | "roadmap") => void;
  onTitleSave: (name: string) => void;
  onSlugClick: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        <Link
          className="text-muted-foreground hover:text-foreground"
          params={{ orgSlug }}
          to="/dashboard/$orgSlug"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <EditableTitle onSave={onTitleSave} value={board?.name ?? ""} />
          <button
            className="mt-1 text-muted-foreground text-sm hover:text-foreground hover:underline"
            onClick={onSlugClick}
            type="button"
          >
            /{orgSlug}/{board?.slug}
          </button>
          {board?.description ? (
            <p className="mt-1 text-muted-foreground">{board.description}</p>
          ) : null}
        </div>
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

        {board?.isPublic === true && org?.isPublic === true && (
          <Button asChild variant="outline">
            <Link
              params={{ orgSlug, boardSlug: board.slug }}
              to="/$orgSlug/$boardSlug"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Public
            </Link>
          </Button>
        )}

        {board !== undefined && org !== undefined ? (
          <BoardActions
            board={board}
            organizationId={org.id}
            orgSlug={orgSlug}
          />
        ) : null}
      </div>
    </div>
  );
}

type FeedbackItem = ReturnType<
  typeof useFeedbackData
>["filteredFeedbacks"][number];

function DashboardListView({
  orgSlug,
  boardSlug,
  filteredFeedbacks,
  pinnedFeedbacks,
  regularFeedbacks,
  hasFilters,
}: {
  orgSlug: string;
  boardSlug: string;
  filteredFeedbacks: FeedbackItem[];
  pinnedFeedbacks: FeedbackItem[];
  regularFeedbacks: FeedbackItem[];
  hasFilters: boolean;
}) {
  return (
    <>
      <FeedbackFilters showSubmitButton={false} />

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

        {filteredFeedbacks.length === 0 && (
          <div className="rounded-lg border bg-muted/30 py-12 text-center">
            <p className="mb-4 text-muted-foreground">
              {hasFilters
                ? "No feedback matches your filters"
                : "No feedback yet"}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

type TagType = {
  id: string;
  name: string;
  color: string;
  organizationId: string;
  isDoneStatus: boolean | null;
  isRoadmapLane: boolean | null;
  laneOrder: number | null;
  createdAt: number;
};

function DashboardRoadmapView({
  board,
  org,
  roadmapItems,
  backlogItems,
  roadmapLaneTags,
}: {
  board: BoardType | undefined;
  org: OrgType | undefined;
  roadmapItems: RoadmapFeedbackItem[];
  backlogItems: RoadmapFeedbackItem[];
  roadmapLaneTags: TagType[];
}) {
  return (
    <>
      <RoadmapKanban
        backlogItems={backlogItems}
        boardId={board?.id ?? ""}
        customLanes={roadmapLaneTags.length > 0 ? roadmapLaneTags : undefined}
        isAdmin={true}
        items={roadmapItems}
        organizationId={org?.id}
      />

      {roadmapItems.length === 0 && backlogItems.length === 0 && (
        <div className="rounded-lg border bg-muted/30 py-12 text-center">
          <p className="text-muted-foreground">
            No feedback yet. Create feedback items and drag them from the
            backlog to the roadmap.
          </p>
        </div>
      )}
    </>
  );
}
