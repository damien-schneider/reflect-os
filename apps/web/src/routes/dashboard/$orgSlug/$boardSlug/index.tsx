import { useQuery, useZero } from "@rocicorp/zero/react";
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
import { BoardActions } from "../../../../components/board/board-actions";
import { SlugEditDialog } from "../../../../components/board/slug-edit-dialog";
import { EditableTitle } from "../../../../components/editable-title";
import {
  FeedbackFilters,
  FeedbackListItem,
  type SortOption,
} from "../../../../components/feedback";
import { RoadmapKanban } from "../../../../components/roadmap/roadmap-kanban";
import { Button } from "../../../../components/ui/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "../../../../components/ui/toggle-group";
import type { FeedbackStatus } from "../../../../lib/constants";
import type { Schema } from "../../../../schema";

export const Route = createFileRoute("/dashboard/$orgSlug/$boardSlug/")({
  component: DashboardBoardIndex,
});

function DashboardBoardIndex() {
  const { orgSlug, boardSlug } = useParams({ strict: false }) as {
    orgSlug: string;
    boardSlug: string;
  };
  const z = useZero<Schema>();
  const navigate = useNavigate();

  // View state: "list" or "roadmap"
  const [viewMode, setViewMode] = useState<"list" | "roadmap">("list");

  // Slug edit dialog state
  const [showSlugDialog, setShowSlugDialog] = useState(false);

  // Get organization and board
  const [orgs] = useQuery(z.query.organization.where("slug", "=", orgSlug));
  const org = orgs?.[0];

  const [boards] = useQuery(
    z.query.board
      .where("organizationId", "=", org?.id ?? "")
      .where("slug", "=", boardSlug)
  );
  const board = boards?.[0];

  // Filter state
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<FeedbackStatus[]>(
    []
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Get tags for this org
  const [tags] = useQuery(
    z.query.tag.where("organizationId", "=", org?.id ?? "")
  );

  // Get ALL feedback for this board (including unapproved for admin)
  let feedbackQuery = z.query.feedback
    .where("boardId", "=", board?.id ?? "")
    .related("author")
    .related("feedbackTags", (q) => q.related("tag"));

  // Apply sorting
  if (sortBy === "newest") {
    feedbackQuery = feedbackQuery.orderBy("createdAt", "desc");
  } else if (sortBy === "oldest") {
    feedbackQuery = feedbackQuery.orderBy("createdAt", "asc");
  } else if (sortBy === "most_votes") {
    feedbackQuery = feedbackQuery.orderBy("voteCount", "desc");
  } else if (sortBy === "most_comments") {
    feedbackQuery = feedbackQuery.orderBy("commentCount", "desc");
  }

  const [feedbacks] = useQuery(feedbackQuery);

  // Client-side filtering
  let filteredFeedbacks = feedbacks ?? [];

  // Filter by search
  if (search) {
    const searchLower = search.toLowerCase();
    filteredFeedbacks = filteredFeedbacks.filter(
      (f) =>
        f.title.toLowerCase().includes(searchLower) ||
        f.description.toLowerCase().includes(searchLower)
    );
  }

  // Filter by status
  if (selectedStatuses.length > 0) {
    filteredFeedbacks = filteredFeedbacks.filter((f) =>
      selectedStatuses.includes(f.status as FeedbackStatus)
    );
  }

  // Filter by tags
  if (selectedTagIds.length > 0) {
    filteredFeedbacks = filteredFeedbacks.filter((f) =>
      f.feedbackTags?.some((ft) => selectedTagIds.includes(ft.tag?.id ?? ""))
    );
  }

  // Separate pinned and regular feedback
  const pinnedFeedbacks = filteredFeedbacks.filter((f) => f.isPinned);
  const regularFeedbacks = filteredFeedbacks.filter((f) => !f.isPinned);

  // Get roadmap items (feedback with roadmapLane set)
  const roadmapFeedbacks = (feedbacks ?? []).filter((f) => f.roadmapLane);

  // Get backlog items (feedback without roadmapLane)
  const backlogFeedbacks = (feedbacks ?? []).filter((f) => !f.roadmapLane);

  // Get roadmap lane tags (tags that are configured as roadmap lanes)
  const roadmapLaneTags = (tags ?? []).filter((t) => t.isRoadmapLane);

  // Transform to the format expected by RoadmapKanban
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

  const roadmapItems = roadmapFeedbacks
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

  const backlogItems = backlogFeedbacks.map((f) => ({
    id: f.id,
    title: f.title,
    description: f.description,
    status: f.status ?? "open",
    voteCount: f.voteCount ?? 0,
    roadmapLane: null,
    roadmapOrder: 0,
    completedAt: f.completedAt ?? null,
  })) as RoadmapFeedbackItem[];

  // Check if this is a newly created board (has default name)
  const isNewBoard = board?.name === "Untitled Board";

  return (
    <div className="space-y-6">
      {/* Get Started Banner for new boards */}
      {isNewBoard === true && (
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
                  <span>
                    Use the menu (⋮) to edit description and visibility
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
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
            <EditableTitle
              onSave={(newName) => {
                if (board) {
                  z.mutate.board.update({
                    id: board.id,
                    name: newName,
                  });
                }
              }}
              value={board?.name ?? ""}
            />
            <button
              className="mt-1 text-muted-foreground text-sm hover:text-foreground hover:underline"
              onClick={() => setShowSlugDialog(true)}
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
          {/* View Toggle */}
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
            <ToggleGroupItem
              aria-label="List view"
              className="px-3"
              value="list"
            >
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

          {/* View Live Button */}
          {board?.isPublic === true && org?.isPublic === true && (
            <Button asChild variant="outline">
              <a
                href={`/${orgSlug}/${boardSlug}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Live
              </a>
            </Button>
          )}

          {/* Board Actions (Edit/Delete) */}
          {board !== undefined && org !== undefined ? (
            <BoardActions
              board={board}
              organizationId={org.id}
              orgSlug={orgSlug}
            />
          ) : null}
        </div>
      </div>

      {/* Render based on view mode */}
      {viewMode === "list" ? (
        <>
          {/* Filters */}
          <FeedbackFilters
            availableTags={tags ?? []}
            onSearchChange={setSearch}
            onSortChange={setSortBy}
            onStatusChange={setSelectedStatuses}
            onTagChange={setSelectedTagIds}
            search={search}
            selectedStatuses={selectedStatuses}
            selectedTagIds={selectedTagIds}
            sortBy={sortBy}
          />

          {/* Results count */}
          <p className="text-muted-foreground text-sm">
            {filteredFeedbacks.length} feedback item
            {filteredFeedbacks.length !== 1 ? "s" : ""}
          </p>

          {/* Feedback List */}
          <div className="space-y-3">
            {/* Pinned items first */}
            {pinnedFeedbacks.map((feedback) => (
              <FeedbackListItem
                boardSlug={boardSlug}
                feedback={feedback}
                key={feedback.id}
                orgSlug={orgSlug}
              />
            ))}

            {/* Regular items */}
            {regularFeedbacks.map((feedback) => (
              <FeedbackListItem
                boardSlug={boardSlug}
                feedback={feedback}
                key={feedback.id}
                orgSlug={orgSlug}
              />
            ))}

            {/* Empty state */}
            {filteredFeedbacks.length === 0 && (
              <div className="rounded-lg border bg-muted/30 py-12 text-center">
                <p className="mb-4 text-muted-foreground">
                  {search ||
                  selectedStatuses.length > 0 ||
                  selectedTagIds.length > 0
                    ? "No feedback matches your filters"
                    : "No feedback yet"}
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Roadmap Kanban View - Admin always sees backlog */}
          <RoadmapKanban
            backlogItems={backlogItems}
            boardId={board?.id ?? ""}
            customLanes={
              roadmapLaneTags.length > 0 ? roadmapLaneTags : undefined
            }
            isAdmin={true}
            items={roadmapItems}
            organizationId={org?.id}
          />

          {/* Empty state for roadmap */}
          {roadmapItems.length === 0 && backlogItems.length === 0 && (
            <div className="rounded-lg border bg-muted/30 py-12 text-center">
              <p className="text-muted-foreground">
                No feedback yet. Create feedback items and drag them from the
                backlog to the roadmap.
              </p>
            </div>
          )}
        </>
      )}

      {/* Slug Edit Dialog */}
      {board !== undefined && (
        <SlugEditDialog
          currentSlug={board.slug}
          onOpenChange={setShowSlugDialog}
          onSave={(newSlug) => {
            z.mutate.board.update({
              id: board.id,
              slug: newSlug,
            });
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
