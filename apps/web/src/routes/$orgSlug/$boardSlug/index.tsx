import { useQuery, useZero } from "@rocicorp/zero/react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { List, Map, Plus } from "lucide-react";
import { useState } from "react";
import {
  FeedbackFilters,
  FeedbackListItem,
  type SortOption,
} from "../../../components/feedback";
import { RoadmapKanban } from "../../../components/roadmap/roadmap-kanban";
import { Button } from "../../../components/ui/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "../../../components/ui/toggle-group";
import { authClient } from "../../../lib/auth-client";
import type { FeedbackStatus } from "../../../lib/constants";
import type { Schema } from "../../../schema";

export const Route = createFileRoute("/$orgSlug/$boardSlug/")({
  component: BoardIndex,
});

function BoardIndex() {
  const { orgSlug, boardSlug } = useParams({ strict: false }) as {
    orgSlug: string;
    boardSlug: string;
  };
  const z = useZero<Schema>();
  const { data: session } = authClient.useSession();

  // View state: "list" or "roadmap"
  const [viewMode, setViewMode] = useState<"list" | "roadmap">("list");

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

  // Get feedback for this board
  let feedbackQuery = z.query.feedback
    .where("boardId", "=", board?.id ?? "")
    .where("isApproved", "=", true)
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

  // Client-side filtering (Zero doesn't support all filter types)
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

  // Get roadmap items (feedback with roadmapLane set) - public view only shows roadmap items
  const roadmapFeedbacks = (feedbacks ?? []).filter((f) => f.roadmapLane);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-bold text-2xl">{board?.name}</h1>
          {board?.description && (
            <p className="mt-1 text-muted-foreground">{board.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <ToggleGroup
            className="rounded-md border"
            onValueChange={(value) =>
              value && setViewMode(value as "list" | "roadmap")
            }
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
              <Map className="mr-1 h-4 w-4" />
              Roadmap
            </ToggleGroupItem>
          </ToggleGroup>

          {session && viewMode === "list" && (
            <Button asChild>
              <Link
                params={{ orgSlug, boardSlug }}
                to="/$orgSlug/$boardSlug/new"
              >
                <Plus className="mr-2 h-4 w-4" />
                Submit Feedback
              </Link>
            </Button>
          )}
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
                    : "No feedback yet. Be the first to share your ideas!"}
                </p>
                {session && (
                  <Button asChild>
                    <Link
                      params={{ orgSlug, boardSlug }}
                      to="/$orgSlug/$boardSlug/new"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Submit Feedback
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Roadmap Kanban View - Public view is read-only, no backlog */}
          <RoadmapKanban
            boardId={board?.id ?? ""}
            customLanes={
              roadmapLaneTags.length > 0 ? roadmapLaneTags : undefined
            }
            isAdmin={false}
            items={roadmapItems}
            organizationId={org?.id}
          />

          {/* Empty state for roadmap */}
          {roadmapItems.length === 0 && (
            <div className="rounded-lg border bg-muted/30 py-12 text-center">
              <p className="text-muted-foreground">
                No items on the roadmap yet.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
