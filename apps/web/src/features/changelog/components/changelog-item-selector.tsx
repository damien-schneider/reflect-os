import { cn } from "@repo/ui/lib/utils";
import { useQuery } from "@rocicorp/zero/react";
import { format } from "date-fns";
import { Check, CheckCircle } from "lucide-react";
import { queries } from "@/queries";

type ChangelogItemSelectorProps = {
  organizationId: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  /** Only show items completed after this date (for auto-population) */
  completedAfter?: number;
};

export function ChangelogItemSelector({
  organizationId,
  selectedIds,
  onSelectionChange,
  completedAfter,
}: ChangelogItemSelectorProps) {
  // Get all boards for this organization
  const [boards] = useQuery(queries.board.byOrganizationId({ organizationId }));

  // Get all completed feedback (items with completedAt set) across all boards
  const [allFeedback] = useQuery(queries.feedback.withRelations({}));

  // Filter to only completed items from this org's boards
  const completedItems = (() => {
    if (!(allFeedback && boards)) {
      return [];
    }

    const boardIds = new Set(boards.map((b) => b.id));

    return allFeedback
      .filter((f) => {
        // Must be in one of the org's boards
        if (!boardIds.has(f.boardId)) {
          return false;
        }
        // Must have a completedAt date
        if (!f.completedAt) {
          return false;
        }
        // Optionally filter by date
        if (completedAfter && f.completedAt < completedAfter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  })();

  // Group by board for better organization
  const groupedByBoard = (() => {
    const groups: Record<
      string,
      { board: (typeof boards)[number]; items: typeof completedItems }
    > = {};

    for (const item of completedItems) {
      const board = boards?.find((b) => b.id === item.boardId);
      if (!board) {
        continue;
      }

      if (!groups[board.id]) {
        groups[board.id] = { board, items: [] };
      }
      groups[board.id].items.push(item);
    }

    return Object.values(groups);
  })();

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
      <div className="rounded-lg border bg-muted/30 py-8 text-center">
        <CheckCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          No completed items yet. Items marked as "Done" in the roadmap will
          appear here.
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
            className="text-primary hover:underline"
            onClick={selectAll}
            type="button"
          >
            Select all
          </button>
          <span className="text-muted-foreground">·</span>
          <button
            className="text-primary hover:underline"
            onClick={deselectAll}
            type="button"
          >
            Deselect all
          </button>
        </div>
      </div>

      {/* Grouped items */}
      <div className="max-h-[400px] space-y-4 overflow-y-auto pr-2">
        {groupedByBoard.map(({ board, items }) => (
          <div className="space-y-2" key={board.id}>
            <h4 className="sticky top-0 bg-background py-1 font-medium text-muted-foreground text-sm">
              {board.name}
            </h4>
            <div className="space-y-1">
              {items.map((item) => (
                <button
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                    selectedIds.includes(item.id)
                      ? "border-primary bg-primary/10"
                      : "hover:bg-muted/50"
                  )}
                  key={item.id}
                  onClick={() => toggleSelection(item.id)}
                  type="button"
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                      selectedIds.includes(item.id)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30"
                    )}
                  >
                    {selectedIds.includes(item.id) && (
                      <Check className="h-3 w-3" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-medium text-sm">
                      {item.title}
                    </p>
                    {item.completedAt && (
                      <p className="mt-0.5 text-muted-foreground text-xs">
                        Completed{" "}
                        {format(new Date(item.completedAt), "MMM d, yyyy")}
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
