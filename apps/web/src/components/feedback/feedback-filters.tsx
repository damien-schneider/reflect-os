import { useState } from "react";
import { Search, Filter, X, SortAsc, SortDesc } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { STATUS_OPTIONS, type FeedbackStatus } from "../../lib/constants";
import { cn } from "../../lib/utils";
import type { Tag } from "../../schema";

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
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search feedback..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter button */}
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
              {filterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                  {filterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-4">
              {/* Status filters */}
              <div>
                <h4 className="text-sm font-medium mb-2">Status</h4>
                <div className="flex flex-wrap gap-1">
                  {STATUS_OPTIONS.map((option) => (
                    <Badge
                      key={option.value}
                      variant={selectedStatuses.includes(option.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleStatus(option.value)}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Tag filters */}
              {availableTags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {availableTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        style={
                          selectedTagIds.includes(tag.id)
                            ? { backgroundColor: tag.color, borderColor: tag.color }
                            : { borderColor: tag.color, color: tag.color }
                        }
                        onClick={() => toggleTag(tag.id)}
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
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="w-full"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
          <SelectTrigger className="w-[160px]">
            {sortBy === "newest" || sortBy === "oldest" ? (
              <SortDesc className="h-4 w-4 mr-2" />
            ) : (
              <SortAsc className="h-4 w-4 mr-2" />
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
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {selectedStatuses.map((status) => {
            const option = STATUS_OPTIONS.find((o) => o.value === status);
            return (
              <Badge
                key={status}
                variant="secondary"
                className="gap-1 cursor-pointer"
                onClick={() => toggleStatus(status)}
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
                key={tagId}
                variant="secondary"
                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                className="gap-1 cursor-pointer"
                onClick={() => toggleTag(tagId)}
              >
                {tag.name}
                <X className="h-3 w-3" />
              </Badge>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
