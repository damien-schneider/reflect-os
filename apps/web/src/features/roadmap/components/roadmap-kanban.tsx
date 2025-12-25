import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Switch } from "@repo/ui/components/switch";
import { cn } from "@repo/ui/lib/utils";
import { useZero } from "@rocicorp/zero/react";
import { Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { RoadmapLaneColumn } from "@/features/roadmap/components/roadmap-lane";
import {
  LANE_CONFIG,
  ROADMAP_LANES,
  type RoadmapLaneWithBacklog,
} from "@/lib/constants";
import { mutators } from "@/mutators";
import { randID } from "@/rand";
import type { Tag } from "@/schema";

// Predefined color palette for new lanes
const COLOR_PALETTE = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
];

// Feedback item with roadmap fields
export interface RoadmapFeedbackItem {
  id: string;
  title: string;
  description: string;
  status: string;
  voteCount: number;
  roadmapLane: string | null;
  roadmapOrder: number;
  completedAt?: number | null;
}

// Lane configuration from tags
export interface LaneConfig {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  isDoneStatus: boolean;
  laneOrder: number;
}

interface RoadmapKanbanProps {
  items: readonly RoadmapFeedbackItem[];
  backlogItems?: readonly RoadmapFeedbackItem[];
  isAdmin?: boolean;
  boardId: string;
  /** Custom lanes from tags - if provided, uses these instead of default lanes */
  customLanes?: readonly Tag[];
  /** Organization ID for tag-based lanes */
  organizationId?: string;
  /** Callback when user wants to add a new item to a lane */
  onAddItem?: (laneId: string) => void;
}

export function RoadmapKanban({
  items,
  backlogItems = [],
  isAdmin = false,
  boardId: _boardId,
  customLanes,
  organizationId,
  onAddItem,
}: RoadmapKanbanProps) {
  const zero = useZero();
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);

  // Add column modal state
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnColor, setNewColumnColor] = useState(COLOR_PALETTE[0]);
  const [newColumnIsDone, setNewColumnIsDone] = useState(false);
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);

  // Build lane configuration from custom lanes or use defaults
  const laneConfigs = ((): LaneConfig[] => {
    if (customLanes && customLanes.length > 0) {
      // Filter to only roadmap lane tags and sort by lane order
      return customLanes
        .filter((t) => t.isRoadmapLane)
        .sort((a, b) => (a.laneOrder ?? 0) - (b.laneOrder ?? 0))
        .map((t) => ({
          id: t.id,
          label: t.name,
          color: t.color,
          bgColor: `bg-[${t.color}]/10`,
          isDoneStatus: t.isDoneStatus ?? false,
          laneOrder: t.laneOrder ?? 0,
        }));
    }
    // Use default lanes
    return ROADMAP_LANES.map((lane) => ({
      id: lane,
      label: LANE_CONFIG[lane].label,
      color: LANE_CONFIG[lane].color,
      bgColor: LANE_CONFIG[lane].bgColor,
      isDoneStatus: false, // Default lanes don't have done status
      laneOrder: ROADMAP_LANES.indexOf(lane),
    }));
  })();

  // Combine items and backlog for lookup
  const allItems = useMemo(
    () => [...items, ...backlogItems],
    [items, backlogItems]
  );

  // Group items by lane (including backlog)
  const itemsByLane = (() => {
    const grouped: Record<string, RoadmapFeedbackItem[]> = {
      backlog: [],
    };

    // Initialize lanes
    for (const lane of laneConfigs) {
      grouped[lane.id] = [];
    }

    // Add backlog items
    for (const item of backlogItems) {
      grouped.backlog.push(item);
    }

    // Add roadmap items to their lanes
    for (const item of items) {
      if (item.roadmapLane && item.roadmapLane in grouped) {
        grouped[item.roadmapLane].push(item);
      }
    }

    // Sort by roadmapOrder within each lane (backlog sorted by title)
    grouped.backlog.sort((a, b) => a.title.localeCompare(b.title));
    for (const lane of laneConfigs) {
      grouped[lane.id]?.sort((a, b) => a.roadmapOrder - b.roadmapOrder);
    }

    return grouped;
  })();

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, item: RoadmapFeedbackItem) => {
      setDraggingItemId(item.id);
      // Set drag data
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData(
        "application/json",
        JSON.stringify({ itemId: item.id })
      );
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    setDraggingItemId(null);
  }, []);

  // Helper: Extract dragged item ID from drag event
  const getDraggedItemId = useCallback(
    (e: React.DragEvent<HTMLDivElement>): string | null => {
      try {
        const data = JSON.parse(e.dataTransfer.getData("application/json"));
        return data.itemId;
      } catch {
        // Fallback to plain text
        return e.dataTransfer.getData("text/plain");
      }
    },
    []
  );

  // Helper: Calculate new sort order for a lane
  const calculateNewSortOrder = useCallback(
    (targetLane: string, draggedItemId: string): number => {
      const laneItems = (itemsByLane[targetLane] ?? []).filter(
        (i) => i.id !== draggedItemId
      );
      return laneItems.length === 0
        ? 1000
        : (laneItems.at(-1)?.roadmapOrder ?? 0) + 1000;
    },
    [itemsByLane]
  );

  // Helper: Build update data for the item
  const buildUpdateData = useCallback(
    (
      draggedItem: RoadmapFeedbackItem,
      targetLane: string,
      newSortOrder: number
    ) => {
      const targetLaneConfig = laneConfigs.find((l) => l.id === targetLane);
      const isDoneLane = targetLaneConfig?.isDoneStatus ?? false;

      const previousLane = draggedItem.roadmapLane;
      const previousLaneConfig = laneConfigs.find((l) => l.id === previousLane);
      const wasInDoneLane = previousLaneConfig?.isDoneStatus ?? false;

      const updateData: {
        id: string;
        roadmapLane: string;
        roadmapOrder: number;
        updatedAt: number;
        completedAt?: number | null;
      } = {
        id: draggedItem.id,
        roadmapLane: targetLane,
        roadmapOrder: newSortOrder,
        updatedAt: Date.now(),
      };

      // Set completedAt when moving to a done lane (if not already set)
      if (isDoneLane && !draggedItem.completedAt) {
        updateData.completedAt = Date.now();
      }
      // Clear completedAt when moving out of a done lane
      else if (!isDoneLane && wasInDoneLane) {
        updateData.completedAt = null;
      }

      return updateData;
    },
    [laneConfigs]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetLane: string) => {
      e.preventDefault();
      setDraggingItemId(null);

      if (!isAdmin) {
        return;
      }

      const draggedItemId = getDraggedItemId(e);
      if (!draggedItemId) {
        return;
      }

      const draggedItem = allItems.find((i) => i.id === draggedItemId);
      if (!draggedItem) {
        return;
      }

      // If dropping into backlog, remove from roadmap
      if (targetLane === "backlog") {
        zero.mutate(
          mutators.feedback.update({
            id: draggedItem.id,
            roadmapLane: null,
            roadmapOrder: null,
            completedAt: null, // Clear completion date when moving to backlog
            updatedAt: Date.now(),
          })
        );
        return;
      }

      const newSortOrder = calculateNewSortOrder(targetLane, draggedItem.id);
      const updateData = buildUpdateData(draggedItem, targetLane, newSortOrder);

      zero.mutate(mutators.feedback.update(updateData));
    },
    [
      isAdmin,
      allItems,
      getDraggedItemId,
      calculateNewSortOrder,
      buildUpdateData,
      zero,
    ]
  );

  // Handle creating a new column (roadmap lane tag)
  const handleCreateColumn = async () => {
    if (!(newColumnName.trim() && organizationId)) {
      return;
    }

    setIsCreatingColumn(true);

    try {
      // Calculate the new lane order (after the last lane)
      const maxOrder = laneConfigs.reduce(
        (max, l) => Math.max(max, l.laneOrder ?? 0),
        0
      );

      await zero.mutate(
        mutators.tag.insert({
          id: randID(),
          organizationId,
          name: newColumnName.trim(),
          color: newColumnColor,
          isDoneStatus: newColumnIsDone,
          isRoadmapLane: true,
          laneOrder: maxOrder + 1000,
          createdAt: Date.now(),
        })
      );

      // Reset form and close modal
      setNewColumnName("");
      setNewColumnColor(COLOR_PALETTE[0]);
      setNewColumnIsDone(false);
      setShowAddColumnModal(false);
    } finally {
      setIsCreatingColumn(false);
    }
  };

  // Build lane display config including backlog
  const allLaneConfigs = (() => {
    const backlogConfig: LaneConfig = {
      id: "backlog",
      label: "Backlog",
      color: "#f59e0b",
      bgColor: "bg-amber-50 dark:bg-amber-950",
      isDoneStatus: false,
      laneOrder: -1,
    };
    return isAdmin ? [backlogConfig, ...laneConfigs] : laneConfigs;
  })();

  // Calculate grid columns (lanes + add column button for admin)
  const gridColumns =
    isAdmin && organizationId
      ? allLaneConfigs.length + 1
      : allLaneConfigs.length;

  return (
    <>
      <div
        className="grid grid-cols-1 gap-4"
        style={{
          gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
        }}
      >
        {allLaneConfigs.map((laneConfig) => (
          <RoadmapLaneColumn
            draggingItemId={draggingItemId}
            isAdmin={isAdmin}
            items={itemsByLane[laneConfig.id] ?? []}
            key={laneConfig.id}
            lane={laneConfig.id as RoadmapLaneWithBacklog}
            laneConfig={laneConfig}
            onAddItem={onAddItem}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
            onDrop={(e) => handleDrop(e, laneConfig.id)}
          />
        ))}

        {/* Add Column Button (admin only, when using custom lanes) */}
        {isAdmin && organizationId && (
          <button
            className={cn(
              "flex min-h-[400px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-muted-foreground/30 border-dashed bg-muted/10 text-muted-foreground transition-all hover:border-primary/50 hover:bg-muted/30 hover:text-foreground"
            )}
            onClick={() => setShowAddColumnModal(true)}
            type="button"
          >
            <Plus className="h-8 w-8" />
            <span className="font-medium text-sm">Add Column</span>
          </button>
        )}
      </div>

      {/* Add Column Modal */}
      <Dialog onOpenChange={setShowAddColumnModal} open={showAddColumnModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Roadmap Column</DialogTitle>
            <DialogDescription>
              Create a new column (status) for your roadmap. This will also
              create a tag that can be used to categorize feedback.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="columnName">Name</Label>
              <Input
                id="columnName"
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="e.g., In Progress, Under Review, Shipped"
                value={newColumnName}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    className={cn(
                      "h-8 w-8 rounded-full transition-all",
                      newColumnColor === c &&
                        "ring-2 ring-primary ring-offset-2"
                    )}
                    key={c}
                    onClick={() => setNewColumnColor(c)}
                    style={{ backgroundColor: c }}
                    type="button"
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-normal text-sm" htmlFor="isDoneStatus">
                  Mark as "Done" Status
                </Label>
                <p className="text-muted-foreground text-xs">
                  Items moved here will be marked as completed for the changelog
                </p>
              </div>
              <Switch
                checked={newColumnIsDone}
                id="isDoneStatus"
                onCheckedChange={setNewColumnIsDone}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowAddColumnModal(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isCreatingColumn || !newColumnName.trim()}
              onClick={handleCreateColumn}
            >
              {isCreatingColumn ? "Creating..." : "Create Column"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
