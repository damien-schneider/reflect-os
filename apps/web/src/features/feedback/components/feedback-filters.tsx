import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { cn } from "@repo/ui/lib/utils";
import { Link, useParams } from "@tanstack/react-router";
import { Filter, Plus, Search, SortAsc, SortDesc, X } from "lucide-react";
import { useState } from "react";
import {
  useBoardData,
  useFeedbackFilters,
  useSession,
} from "@/features/feedback/hooks/use-feedback-filters";
import type { SortOption } from "@/features/feedback/store/atoms";
import { STATUS_OPTIONS } from "@/lib/constants";

interface FeedbackFiltersProps {
  className?: string;
  showSubmitButton?: boolean;
}

/**
 * Feedback filter controls component.
 * Uses Jotai atoms internally for state management - no props drilling needed.
 * Filter preferences are automatically persisted to localStorage.
 */
export function FeedbackFilters({
  className,
  showSubmitButton = true,
}: FeedbackFiltersProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const { orgSlug, boardSlug } = useParams({ strict: false }) as {
    orgSlug: string;
    boardSlug: string;
  };
  const session = useSession();
  const { tags } = useBoardData();

  const {
    search,
    setSearch,
    sortBy,
    setSortBy,
    selectedStatuses,
    selectedTagIds,
    hasFilters,
    filterCount,
    toggleStatus,
    toggleTag,
    clearStatusAndTagFilters,
  } = useFeedbackFilters();

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search and main controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative max-w-sm flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search feedback..."
              type="search"
              value={search}
            />
          </div>

          {/* Filter button */}
          <Popover onOpenChange={setFilterOpen} open={filterOpen}>
            <PopoverTrigger
              render={<Button className="gap-2" variant="outline" />}
            >
              <Filter className="h-4 w-4" />
              Filter
              {filterCount > 0 && (
                <Badge
                  className="ml-1 flex h-5 w-5 items-center justify-center p-0"
                  variant="secondary"
                >
                  {filterCount}
                </Badge>
              )}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72">
              <div className="space-y-4">
                {/* Status filters */}
                <div>
                  <h4 className="mb-2 font-medium text-sm">Status</h4>
                  <div className="flex flex-wrap gap-1">
                    {STATUS_OPTIONS.map((option) => (
                      <Badge
                        className="cursor-pointer"
                        key={option.value}
                        onClick={() => toggleStatus(option.value)}
                        variant={
                          selectedStatuses.includes(option.value)
                            ? "default"
                            : "outline"
                        }
                      >
                        {option.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Tag filters */}
                {tags.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-medium text-sm">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <Badge
                          className="cursor-pointer"
                          key={tag.id}
                          onClick={() => toggleTag(tag.id)}
                          style={
                            selectedTagIds.includes(tag.id)
                              ? {
                                  backgroundColor: tag.color ?? undefined,
                                  borderColor: tag.color ?? undefined,
                                }
                              : {
                                  borderColor: tag.color ?? undefined,
                                  color: tag.color ?? undefined,
                                }
                          }
                          variant={
                            selectedTagIds.includes(tag.id)
                              ? "default"
                              : "outline"
                          }
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clear button */}
                {hasFilters && (
                  <Button
                    className="w-full"
                    onClick={clearStatusAndTagFilters}
                    size="sm"
                    variant="ghost"
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Sort */}
          <Select
            onValueChange={(v) => setSortBy(v as SortOption)}
            value={sortBy}
          >
            <SelectTrigger className="w-40">
              {sortBy === "newest" || sortBy === "oldest" ? (
                <SortDesc className="mr-2 h-4 w-4" />
              ) : (
                <SortAsc className="mr-2 h-4 w-4" />
              )}
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="most_votes">Most votes</SelectItem>
              <SelectItem value="most_comments">Most comments</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showSubmitButton && session !== null && orgSlug && boardSlug ? (
          <Button
            render={
              <Link
                params={{ orgSlug, boardSlug }}
                to="/$orgSlug/$boardSlug/new"
              />
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Submit Feedback
          </Button>
        ) : null}
      </div>

      {/* Active filter tags */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">Active filters:</span>
          {selectedStatuses.map((status) => {
            const option = STATUS_OPTIONS.find((o) => o.value === status);
            return (
              <Badge
                className="cursor-pointer gap-1"
                key={status}
                onClick={() => toggleStatus(status)}
                variant="secondary"
              >
                {option?.label ?? status}
                <X className="h-3 w-3" />
              </Badge>
            );
          })}
          {selectedTagIds.map((tagId) => {
            const tag = tags.find((t) => t.id === tagId);
            if (!tag) {
              return null;
            }
            return (
              <Badge
                className="cursor-pointer gap-1"
                key={tagId}
                onClick={() => toggleTag(tagId)}
                style={{
                  backgroundColor: `${tag.color}20`,
                  color: tag.color ?? undefined,
                }}
                variant="secondary"
              >
                {tag.name}
                <X className="h-3 w-3" />
              </Badge>
            );
          })}
          <Button
            className="h-6 text-xs"
            onClick={clearStatusAndTagFilters}
            size="sm"
            variant="ghost"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}

// Re-export SortOption type from atoms
export type { SortOption } from "@/features/feedback/store/atoms";
