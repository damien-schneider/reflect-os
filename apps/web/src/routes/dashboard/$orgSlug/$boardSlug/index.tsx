import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { List, Map, ExternalLink, ArrowLeft } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "../../../../components/ui/toggle-group";
import {
  FeedbackFilters,
  FeedbackListItem,
  type SortOption,
} from "../../../../components/feedback";
import { RoadmapKanban } from "../../../../components/roadmap/roadmap-kanban";
import { type FeedbackStatus } from "../../../../lib/constants";
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
  const [selectedStatuses, setSelectedStatuses] = useState<FeedbackStatus[]>([]);
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

  const backlogItems = backlogFeedbacks
    .map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      status: f.status ?? "open",
      voteCount: f.voteCount ?? 0,
      roadmapLane: null,
      roadmapOrder: 0,
      completedAt: f.completedAt ?? null,
    })) as RoadmapFeedbackItem[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard/$orgSlug"
            params={{ orgSlug }}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{board?.name}</h1>
            {board?.description && (
              <p className="text-muted-foreground mt-1">{board.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as "list" | "roadmap")}
            className="border rounded-md"
          >
            <ToggleGroupItem value="list" aria-label="List view" className="px-3">
              <List className="h-4 w-4 mr-1" />
              List
            </ToggleGroupItem>
            <ToggleGroupItem value="roadmap" aria-label="Roadmap view" className="px-3">
              <Map className="h-4 w-4 mr-1" />
              Roadmap
            </ToggleGroupItem>
          </ToggleGroup>

          {/* View Live Button */}
          {board?.isPublic && org?.isPublic && (
            <Button variant="outline" asChild>
              <a
                href={`/${orgSlug}/${boardSlug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Live
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Render based on view mode */}
      {viewMode === "list" ? (
        <>
          {/* Filters */}
          <FeedbackFilters
            search={search}
            onSearchChange={setSearch}
            selectedStatuses={selectedStatuses}
            onStatusChange={setSelectedStatuses}
            selectedTagIds={selectedTagIds}
            onTagChange={setSelectedTagIds}
            sortBy={sortBy}
            onSortChange={setSortBy}
            availableTags={tags ?? []}
          />

          {/* Results count */}
          <p className="text-sm text-muted-foreground">
            {filteredFeedbacks.length} feedback item
            {filteredFeedbacks.length !== 1 ? "s" : ""}
          </p>

          {/* Feedback List */}
          <div className="space-y-3">
            {/* Pinned items first */}
            {pinnedFeedbacks.map((feedback) => (
              <FeedbackListItem
                key={feedback.id}
                feedback={feedback}
                orgSlug={orgSlug}
                boardSlug={boardSlug}
              />
            ))}

            {/* Regular items */}
            {regularFeedbacks.map((feedback) => (
              <FeedbackListItem
                key={feedback.id}
                feedback={feedback}
                orgSlug={orgSlug}
                boardSlug={boardSlug}
              />
            ))}

            {/* Empty state */}
            {filteredFeedbacks.length === 0 && (
              <div className="text-center py-12 border rounded-lg bg-muted/30">
                <p className="text-muted-foreground mb-4">
                  {search || selectedStatuses.length > 0 || selectedTagIds.length > 0
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
            items={roadmapItems}
            backlogItems={backlogItems}
            isAdmin={true}
            boardId={board?.id ?? ""}
            customLanes={roadmapLaneTags.length > 0 ? roadmapLaneTags : undefined}
            organizationId={org?.id}
          />

          {/* Empty state for roadmap */}
          {roadmapItems.length === 0 && backlogItems.length === 0 && (
            <div className="text-center py-12 border rounded-lg bg-muted/30">
              <p className="text-muted-foreground">
                No feedback yet. Create feedback items and drag them from the backlog to the roadmap.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
