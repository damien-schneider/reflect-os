import { useMemo } from "react";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { format } from "date-fns";
import { Check, CheckCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import type { Schema } from "../../schema";

interface ChangelogItemSelectorProps {
  organizationId: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  /** Only show items completed after this date (for auto-population) */
  completedAfter?: number;
}

export function ChangelogItemSelector({
  organizationId,
  selectedIds,
  onSelectionChange,
  completedAfter,
}: ChangelogItemSelectorProps) {
  const z = useZero<Schema>();

  // Get all boards for this organization
  const [boards] = useQuery(
    z.query.board.where("organizationId", "=", organizationId)
  );

  // Get all completed feedback (items with completedAt set) across all boards
  const [allFeedback] = useQuery(
    z.query.feedback.related("board")
  );

  // Filter to only completed items from this org's boards
  const completedItems = useMemo(() => {
    if (!allFeedback || !boards) return [];
    
    const boardIds = new Set(boards.map((b) => b.id));
    
    return allFeedback
      .filter((f) => {
        // Must be in one of the org's boards
        if (!boardIds.has(f.boardId)) return false;
        // Must have a completedAt date
        if (!f.completedAt) return false;
        // Optionally filter by date
        if (completedAfter && f.completedAt < completedAfter) return false;
        return true;
      })
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  }, [allFeedback, boards, completedAfter]);

  // Group by board for better organization
  const groupedByBoard = useMemo(() => {
    const groups: Record<string, { board: typeof boards[number]; items: typeof completedItems }> = {};
    
    for (const item of completedItems) {
      const board = boards?.find((b) => b.id === item.boardId);
      if (!board) continue;
      
      if (!groups[board.id]) {
        groups[board.id] = { board, items: [] };
      }
      groups[board.id].items.push(item);
    }
    
    return Object.values(groups);
  }, [completedItems, boards]);

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    onSelectionChange(completedItems.map((i) => i.id));
  };

  const deselectAll = () => {
    onSelectionChange([]);
  };

  if (completedItems.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg bg-muted/30">
        <CheckCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground text-sm">
          No completed items yet. Items marked as "Done" in the roadmap will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selection actions */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {selectedIds.length} of {completedItems.length} selected
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="text-primary hover:underline"
          >
            Select all
          </button>
          <span className="text-muted-foreground">·</span>
          <button
            type="button"
            onClick={deselectAll}
            className="text-primary hover:underline"
          >
            Deselect all
          </button>
        </div>
      </div>

      {/* Grouped items */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {groupedByBoard.map(({ board, items }) => (
          <div key={board.id} className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background py-1">
              {board.name}
            </h4>
            <div className="space-y-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleSelection(item.id)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                    selectedIds.includes(item.id)
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div
                    className={cn(
                      "h-5 w-5 rounded border flex items-center justify-center shrink-0 mt-0.5",
                      selectedIds.includes(item.id)
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/30"
                    )}
                  >
                    {selectedIds.includes(item.id) && (
                      <Check className="h-3 w-3" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-1">
                      {item.title}
                    </p>
                    {item.completedAt && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Completed {format(new Date(item.completedAt), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
