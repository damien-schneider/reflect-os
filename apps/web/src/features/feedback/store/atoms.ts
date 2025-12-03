import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { FeedbackStatus } from "../../../lib/constants";

export type SortOption = "newest" | "oldest" | "most_votes" | "most_comments";

/**
 * Feedback filter state atoms with localStorage persistence.
 * These atoms are scoped per board using a key pattern: feedback-filters-{boardId}
 * Using atomWithStorage ensures filter preferences persist across page refreshes.
 */

// Search query (not persisted since it's usually temporary)
export const feedbackSearchAtom = atom("");

// Sort option - persisted since users often have a preferred sort order
export const feedbackSortAtom = atomWithStorage<SortOption>(
  "feedback-sort",
  "newest"
);

// Selected status filters - persisted
export const feedbackStatusFiltersAtom = atomWithStorage<FeedbackStatus[]>(
  "feedback-status-filters",
  []
);

// Selected tag IDs - not persisted since tags are board-specific
export const feedbackTagFiltersAtom = atom<string[]>([]);

// View mode (list vs roadmap) - persisted
export const feedbackViewModeAtom = atomWithStorage<"list" | "roadmap">(
  "feedback-view-mode",
  "list"
);

// Derived atom to check if any filters are active
export const hasActiveFiltersAtom = atom((get) => {
  const search = get(feedbackSearchAtom);
  const statuses = get(feedbackStatusFiltersAtom);
  const tags = get(feedbackTagFiltersAtom);
  return search !== "" || statuses.length > 0 || tags.length > 0;
});

// Derived atom for total filter count (for badge display)
export const filterCountAtom = atom((get) => {
  const statuses = get(feedbackStatusFiltersAtom);
  const tags = get(feedbackTagFiltersAtom);
  return statuses.length + tags.length;
});
