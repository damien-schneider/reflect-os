import { useQuery } from "@rocicorp/zero/react";
import { useParams } from "@tanstack/react-router";
import { useAtom, useAtomValue } from "jotai";
import {
  feedbackSearchAtom,
  feedbackSortAtom,
  feedbackStatusFiltersAtom,
  feedbackTagFiltersAtom,
  feedbackViewModeAtom,
  filterCountAtom,
  hasActiveFiltersAtom,
} from "@/features/feedback/store/atoms";
import { authClient } from "@/lib/auth-client";
import type { FeedbackStatus } from "@/lib/constants";
import { queries } from "@/queries";

/**
 * Hook for managing feedback filter state.
 * Uses Jotai atoms for state management, eliminating props drilling.
 * Filter preferences (sort, statuses, view mode) are persisted to localStorage.
 */
export function useFeedbackFilters() {
  const [search, setSearch] = useAtom(feedbackSearchAtom);
  const [sortBy, setSortBy] = useAtom(feedbackSortAtom);
  const [selectedStatuses, setSelectedStatuses] = useAtom(
    feedbackStatusFiltersAtom
  );
  const [selectedTagIds, setSelectedTagIds] = useAtom(feedbackTagFiltersAtom);
  const [viewMode, setViewMode] = useAtom(feedbackViewModeAtom);
  const hasFilters = useAtomValue(hasActiveFiltersAtom);
  const filterCount = useAtomValue(filterCountAtom);

  const toggleStatus = (status: FeedbackStatus) => {
    if (selectedStatuses.includes(status)) {
      setSelectedStatuses(selectedStatuses.filter((s) => s !== status));
    } else {
      setSelectedStatuses([...selectedStatuses, status]);
    }
  };

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId));
    } else {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedStatuses([]);
    setSelectedTagIds([]);
  };

  const clearStatusAndTagFilters = () => {
    setSelectedStatuses([]);
    setSelectedTagIds([]);
  };

  return {
    // State
    search,
    sortBy,
    selectedStatuses,
    selectedTagIds,
    viewMode,
    hasFilters,
    filterCount,

    // Setters
    setSearch,
    setSortBy,
    setSelectedStatuses,
    setSelectedTagIds,
    setViewMode,

    // Actions
    toggleStatus,
    toggleTag,
    clearFilters,
    clearStatusAndTagFilters,
  };
}

/**
 * Hook for fetching board data using Zero client and route params.
 * Uses named queries for proper Zero 0.25 data sync.
 * Eliminates need to pass orgSlug/boardSlug through props.
 */
export function useBoardData() {
  const { orgSlug, boardSlug } = useParams({ strict: false }) as {
    orgSlug: string;
    boardSlug: string;
  };

  const [orgs] = useQuery(queries.organization.bySlug({ slug: orgSlug }));
  const org = orgs?.[0];

  const [boards] = useQuery(
    queries.board.byOrgAndSlug({
      organizationId: org?.id ?? "",
      slug: boardSlug,
    })
  );
  const board = boards?.[0];

  const [tags] = useQuery(
    queries.tag.byOrganizationId({ organizationId: org?.id ?? "" })
  );

  return {
    org,
    board,
    tags: tags ?? [],
    orgSlug,
    boardSlug,
  };
}

/**
 * Hook for fetching filtered and sorted feedback.
 * Uses named queries for proper Zero 0.25 data sync.
 * Combines Zero queries with client-side filtering from atoms.
 */
export function useFeedbackData(options?: { includeUnapproved?: boolean }) {
  const { board } = useBoardData();
  const { sortBy, search, selectedStatuses, selectedTagIds } =
    useFeedbackFilters();

  // Use named query for proper Zero 0.25 server sync
  // This ensures the server knows what data to sync to the client
  const [rawFeedbacks] = useQuery(
    queries.feedback.byBoardId({ boardId: board?.id ?? "" })
  );

  // Client-side filtering and sorting
  // (Named queries have fixed ordering, so we sort client-side for flexibility)
  let feedbacks = rawFeedbacks ?? [];

  // Filter by approved status
  if (!options?.includeUnapproved) {
    feedbacks = feedbacks.filter((f) => f.isApproved);
  }

  // Apply sorting
  if (sortBy === "newest") {
    feedbacks = [...feedbacks].sort((a, b) => b.createdAt - a.createdAt);
  } else if (sortBy === "oldest") {
    feedbacks = [...feedbacks].sort((a, b) => a.createdAt - b.createdAt);
  } else if (sortBy === "most_votes") {
    feedbacks = [...feedbacks].sort(
      (a, b) => (b.voteCount ?? 0) - (a.voteCount ?? 0)
    );
  } else if (sortBy === "most_comments") {
    feedbacks = [...feedbacks].sort(
      (a, b) => (b.commentCount ?? 0) - (a.commentCount ?? 0)
    );
  }

  // Client-side filtering
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
      f.tags?.some((tag) => selectedTagIds.includes(tag?.id ?? ""))
    );
  }

  const pinnedFeedbacks = filtered.filter((f) => f.isPinned);
  const regularFeedbacks = filtered.filter((f) => !f.isPinned);

  return {
    feedbacks,
    filteredFeedbacks: filtered,
    pinnedFeedbacks,
    regularFeedbacks,
  };
}

/**
 * Hook for session data - wraps authClient for consistency
 */
export function useSession() {
  const { data: session } = authClient.useSession();
  return session;
}
