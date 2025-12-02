import { Filter, Search, SortAsc, SortDesc, X } from "lucide-react";
import { useState } from "react";
import { type FeedbackStatus, STATUS_OPTIONS } from "../../lib/constants";
import { cn } from "../../lib/utils";
import type { Tag } from "../../schema";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export type SortOption = "newest" | "oldest" | "most_votes" | "most_comments";

interface FeedbackFiltersProps {
  search: string;
  onSearchChange: (search: string) => void;
  selectedStatuses: FeedbackStatus[];
  onStatusChange: (statuses: FeedbackStatus[]) => void;
  selectedTagIds: string[];
  onTagChange: (tagIds: string[]) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  availableTags: Tag[];
  className?: string;
}

export function FeedbackFilters({
  search,
  onSearchChange,
  selectedStatuses,
  onStatusChange,
  selectedTagIds,
  onTagChange,
  sortBy,
  onSortChange,
  availableTags,
  className,
}: FeedbackFiltersProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  const hasFilters = selectedStatuses.length > 0 || selectedTagIds.length > 0;
  const filterCount = selectedStatuses.length + selectedTagIds.length;

  const toggleStatus = (status: FeedbackStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onStatusChange([...selectedStatuses, status]);
    }
  };

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagChange([...selectedTagIds, tagId]);
    }
  };

  const clearFilters = () => {
    onStatusChange([]);
    onTagChange([]);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search and main controls */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative max-w-sm flex-1">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search feedback..."
            type="search"
            value={search}
          />
        </div>

        {/* Filter button */}
        <Popover onOpenChange={setFilterOpen} open={filterOpen}>
          <PopoverTrigger asChild>
            <Button className="gap-2" variant="outline">
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
            </Button>
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
              {availableTags.length > 0 && (
                <div>
                  <h4 className="mb-2 font-medium text-sm">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {availableTags.map((tag) => (
                      <Badge
                        className="cursor-pointer"
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        style={
                          selectedTagIds.includes(tag.id)
                            ? {
                                backgroundColor: tag.color,
                                borderColor: tag.color,
                              }
                            : { borderColor: tag.color, color: tag.color }
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
                  onClick={clearFilters}
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
          onValueChange={(v) => onSortChange(v as SortOption)}
          value={sortBy}
        >
          <SelectTrigger className="w-[160px]">
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
            const tag = availableTags.find((t) => t.id === tagId);
            if (!tag) return null;
            return (
              <Badge
                className="cursor-pointer gap-1"
                key={tagId}
                onClick={() => toggleTag(tagId)}
                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                variant="secondary"
              >
                {tag.name}
                <X className="h-3 w-3" />
              </Badge>
            );
          })}
          <Button
            className="h-6 text-xs"
            onClick={clearFilters}
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
