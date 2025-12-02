import { useQuery, useZero } from "@rocicorp/zero/react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { List, Map as MapIcon, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminFloatingBar } from "../../../components/admin-floating-bar";
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

function useBoardData(orgSlug: string, boardSlug: string) {
  const z = useZero<Schema>();

  const [orgs] = useQuery(z.query.organization.where("slug", "=", orgSlug));
  const org = orgs?.[0];

  const [boards] = useQuery(
    z.query.board
      .where("organizationId", "=", org?.id ?? "")
      .where("slug", "=", boardSlug)
  );
  const board = boards?.[0];

  const [tags] = useQuery(
    z.query.tag.where("organizationId", "=", org?.id ?? "")
  );

  return { z, org, board, tags };
}

function useFeedbackQuery(
  z: ReturnType<typeof useZero<Schema>>,
  boardId: string,
  sortBy: SortOption
) {
  let feedbackQuery = z.query.feedback
    .where("boardId", "=", boardId)
    .where("isApproved", "=", true)
    .related("author")
    .related("feedbackTags", (q) => q.related("tag"));

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
  return feedbacks ?? [];
}

function filterFeedbacks(
  feedbacks: ReturnType<typeof useFeedbackQuery>,
  search: string,
  selectedStatuses: FeedbackStatus[],
  selectedTagIds: string[]
) {
  let filtered = feedbacks;

  if (search !== "") {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      (f) =>
        f.title.toLowerCase().includes(searchLower) ||
        f.description.toLowerCase().includes(searchLower)
    );
  }

  if (selectedStatuses.length > 0) {
    filtered = filtered.filter((f) =>
      selectedStatuses.includes(f.status as FeedbackStatus)
    );
  }

  if (selectedTagIds.length > 0) {
    filtered = filtered.filter((f) =>
      f.feedbackTags?.some((ft) => selectedTagIds.includes(ft.tag?.id ?? ""))
    );
  }

  return filtered;
}

function BoardIndex() {
  const { orgSlug, boardSlug } = useParams({ strict: false }) as {
    orgSlug: string;
    boardSlug: string;
  };
  const { data: session } = authClient.useSession();
  const { data: authOrganizations } = authClient.useListOrganizations();
  const isOrgMember = authOrganizations?.some((o) => o.slug === orgSlug);

  const [viewMode, setViewMode] = useState<"list" | "roadmap">("list");
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<FeedbackStatus[]>(
    []
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const { z, org, board, tags } = useBoardData(orgSlug, boardSlug);
  const feedbacks = useFeedbackQuery(z, board?.id ?? "", sortBy);

  const filteredFeedbacks = useMemo(
    () => filterFeedbacks(feedbacks, search, selectedStatuses, selectedTagIds),
    [feedbacks, search, selectedStatuses, selectedTagIds]
  );

  const pinnedFeedbacks = useMemo(
    () => filteredFeedbacks.filter((f) => f.isPinned),
    [filteredFeedbacks]
  );

  const regularFeedbacks = useMemo(
    () => filteredFeedbacks.filter((f) => !f.isPinned),
    [filteredFeedbacks]
  );

  const roadmapLaneTags = useMemo(
    () => (tags ?? []).filter((t) => t.isRoadmapLane),
    [tags]
  );

  const roadmapItems = useMemo(
    () =>
      feedbacks
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
        .sort(
          (a, b) => a.roadmapOrder - b.roadmapOrder
        ) as RoadmapFeedbackItem[],
    [feedbacks]
  );

  const hasFilters =
    search !== "" || selectedStatuses.length > 0 || selectedTagIds.length > 0;

  return (
    <div className="space-y-6">
      <BoardHeader
        board={board}
        boardSlug={boardSlug}
        orgSlug={orgSlug}
        session={session}
        setViewMode={setViewMode}
        viewMode={viewMode}
      />

      {viewMode === "list" ? (
        <ListView
          boardSlug={boardSlug}
          filteredFeedbacks={filteredFeedbacks}
          hasFilters={hasFilters}
          onSearchChange={setSearch}
          onSortChange={setSortBy}
          onStatusChange={setSelectedStatuses}
          onTagChange={setSelectedTagIds}
          orgSlug={orgSlug}
          pinnedFeedbacks={pinnedFeedbacks}
          regularFeedbacks={regularFeedbacks}
          search={search}
          selectedStatuses={selectedStatuses}
          selectedTagIds={selectedTagIds}
          session={session}
          sortBy={sortBy}
          tags={tags ?? []}
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
        <AdminFloatingBar
          dashboardLink={{
            to: "/dashboard/$orgSlug/$boardSlug",
            params: { orgSlug, boardSlug },
          }}
          message="You're viewing the public page"
        />
      ) : null}
    </div>
  );
}

type BoardData = {
  name?: string;
  description?: string;
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
  session,
  orgSlug,
  boardSlug,
}: {
  board: BoardData | undefined;
  viewMode: "list" | "roadmap";
  setViewMode: (mode: "list" | "roadmap") => void;
  session: SessionData;
  orgSlug: string;
  boardSlug: string;
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

        {session !== null && viewMode === "list" ? (
          <Button asChild>
            <Link params={{ orgSlug, boardSlug }} to="/$orgSlug/$boardSlug/new">
              <Plus className="mr-2 h-4 w-4" />
              Submit Feedback
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

type FeedbackItem = ReturnType<typeof useFeedbackQuery>[number];

type Tag = {
  id: string;
  name: string;
  color?: string | null;
  isRoadmapLane?: boolean;
};

function ListView({
  tags,
  search,
  selectedStatuses,
  selectedTagIds,
  sortBy,
  onSearchChange,
  onSortChange,
  onStatusChange,
  onTagChange,
  filteredFeedbacks,
  pinnedFeedbacks,
  regularFeedbacks,
  hasFilters,
  session,
  orgSlug,
  boardSlug,
}: {
  tags: Tag[];
  search: string;
  selectedStatuses: FeedbackStatus[];
  selectedTagIds: string[];
  sortBy: SortOption;
  onSearchChange: (search: string) => void;
  onSortChange: (sort: SortOption) => void;
  onStatusChange: (statuses: FeedbackStatus[]) => void;
  onTagChange: (tagIds: string[]) => void;
  filteredFeedbacks: FeedbackItem[];
  pinnedFeedbacks: FeedbackItem[];
  regularFeedbacks: FeedbackItem[];
  hasFilters: boolean;
  session: SessionData;
  orgSlug: string;
  boardSlug: string;
}) {
  return (
    <>
      <FeedbackFilters
        availableTags={tags}
        onSearchChange={onSearchChange}
        onSortChange={onSortChange}
        onStatusChange={onStatusChange}
        onTagChange={onTagChange}
        search={search}
        selectedStatuses={selectedStatuses}
        selectedTagIds={selectedTagIds}
        sortBy={sortBy}
      />

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
            orgSlug={orgSlug}
            session={session}
          />
        ) : null}
      </div>
    </>
  );
}

function EmptyState({
  hasFilters,
  session,
  orgSlug,
  boardSlug,
}: {
  hasFilters: boolean;
  session: SessionData;
  orgSlug: string;
  boardSlug: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 py-12 text-center">
      <p className="mb-4 text-muted-foreground">
        {hasFilters
          ? "No feedback matches your filters"
          : "No feedback yet. Be the first to share your ideas!"}
      </p>
      {session !== null ? (
        <Button asChild>
          <Link params={{ orgSlug, boardSlug }} to="/$orgSlug/$boardSlug/new">
            <Plus className="mr-2 h-4 w-4" />
            Submit Feedback
          </Link>
        </Button>
      ) : null}
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
    <>
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
    </>
  );
}
