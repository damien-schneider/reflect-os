import { useQuery, useZero } from "@rocicorp/zero/react";
import { useParams } from "@tanstack/react-router";
import { useAtom, useAtomValue } from "jotai";
import { authClient } from "../../../lib/auth-client";
import type { FeedbackStatus } from "../../../lib/constants";
import type { Schema } from "../../../schema";
import {
  feedbackSearchAtom,
  feedbackSortAtom,
  feedbackStatusFiltersAtom,
  feedbackTagFiltersAtom,
  feedbackViewModeAtom,
  filterCountAtom,
  hasActiveFiltersAtom,
} from "../store/atoms";

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
 * Eliminates need to pass orgSlug/boardSlug through props.
 */
export function useBoardData() {
  const { orgSlug, boardSlug } = useParams({ strict: false }) as {
    orgSlug: string;
    boardSlug: string;
  };
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

  return {
    z,
    org,
    board,
    tags: tags ?? [],
    orgSlug,
    boardSlug,
  };
}

/**
 * Hook for fetching filtered and sorted feedback.
 * Combines Zero queries with client-side filtering from atoms.
 */
export function useFeedbackData(options?: { includeUnapproved?: boolean }) {
  const { z, board } = useBoardData();
  const { sortBy, search, selectedStatuses, selectedTagIds } =
    useFeedbackFilters();

  let feedbackQuery = z.query.feedback
    .where("boardId", "=", board?.id ?? "")
    .related("author")
    .related("feedbackTags", (q) => q.related("tag"));

  // Only filter by approved for public views
  if (!options?.includeUnapproved) {
    feedbackQuery = feedbackQuery.where("isApproved", "=", true);
  }

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
  let filtered = feedbacks ?? [];

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

  const pinnedFeedbacks = filtered.filter((f) => f.isPinned);
  const regularFeedbacks = filtered.filter((f) => !f.isPinned);

  return {
    feedbacks: feedbacks ?? [],
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
