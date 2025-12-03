import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useZero } from "@rocicorp/zero/react";
import { useMemo, useState } from "react";
import {
  LANE_CONFIG,
  ROADMAP_LANES,
  type RoadmapLaneWithBacklog,
} from "@/lib/constants";
import type { Schema, Tag } from "@/schema";
import { RoadmapItemCard } from "./roadmap-item-card";
import { RoadmapLaneColumn } from "./roadmap-lane";

// Feedback item with roadmap fields
export type RoadmapFeedbackItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  voteCount: number;
  roadmapLane: string | null;
  roadmapOrder: number;
  completedAt?: number | null;
};

// Lane configuration from tags
export type LaneConfig = {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  isDoneStatus: boolean;
  laneOrder: number;
};

type RoadmapKanbanProps = {
  items: readonly RoadmapFeedbackItem[];
  backlogItems?: readonly RoadmapFeedbackItem[];
  isAdmin?: boolean;
  boardId: string;
  /** Custom lanes from tags - if provided, uses these instead of default lanes */
  customLanes?: readonly Tag[];
  /** Organization ID for tag-based lanes */
  organizationId?: string;
};

export function RoadmapKanban({
  items,
  backlogItems = [],
  isAdmin = false,
  boardId: _boardId,
  customLanes,
  organizationId: _organizationId,
}: RoadmapKanbanProps) {
  const z = useZero<Schema>();
  const [activeItem, setActiveItem] = useState<RoadmapFeedbackItem | null>(
    null
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Build lane configuration from custom lanes or use defaults
  const laneConfigs = useMemo((): LaneConfig[] => {
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
  }, [customLanes]);

  // Get all lane IDs including backlog for admin
  const laneIds = useMemo(() => {
    const ids = laneConfigs.map((l) => l.id);
    return isAdmin ? ["backlog", ...ids] : ids;
  }, [laneConfigs, isAdmin]);

  // Combine items and backlog for lookup
  const allItems = useMemo(
    () => [...items, ...backlogItems],
    [items, backlogItems]
  );

  // Group items by lane (including backlog)
  const itemsByLane = useMemo(() => {
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
  }, [items, backlogItems, laneConfigs]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const item = allItems.find((i) => i.id === active.id);
    if (item) {
      setActiveItem(item);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!(over && isAdmin)) {
      return;
    }

    const draggedItem = allItems.find((i) => i.id === active.id);
    if (!draggedItem) {
      return;
    }

    // Determine target lane
    let targetLane: string;
    let targetIndex: number;

    // Check if dropped on a lane
    if (laneIds.includes(over.id as string)) {
      targetLane = over.id as string;
      targetIndex = itemsByLane[targetLane]?.length ?? 0;
    } else {
      // Dropped on another item
      const overItem = allItems.find((i) => i.id === over.id);
      if (!overItem) {
        return;
      }

      targetLane = overItem.roadmapLane ?? "backlog";
      const laneItems = itemsByLane[targetLane] ?? [];
      targetIndex = laneItems.findIndex((i) => i.id === over.id);
    }

    // If dropping into backlog, remove from roadmap
    if (targetLane === "backlog") {
      z.mutate.feedback.update({
        id: draggedItem.id,
        roadmapLane: null,
        roadmapOrder: null,
        completedAt: null, // Clear completion date when moving to backlog
        updatedAt: Date.now(),
      });
      return;
    }

    // Calculate new sort order
    const laneItems = (itemsByLane[targetLane] ?? []).filter(
      (i) => i.id !== draggedItem.id
    );
    let newSortOrder: number;

    if (laneItems.length === 0) {
      newSortOrder = 1000;
    } else if (targetIndex === 0) {
      newSortOrder = (laneItems[0]?.roadmapOrder ?? 1000) / 2;
    } else if (targetIndex >= laneItems.length) {
      newSortOrder = (laneItems.at(-1)?.roadmapOrder ?? 0) + 1000;
    } else {
      const prevOrder = laneItems[targetIndex - 1]?.roadmapOrder ?? 0;
      const nextOrder =
        laneItems[targetIndex]?.roadmapOrder ?? prevOrder + 2000;
      newSortOrder = (prevOrder + nextOrder) / 2;
    }

    // Check if target lane is a "Done" status lane
    const targetLaneConfig = laneConfigs.find((l) => l.id === targetLane);
    const isDoneLane = targetLaneConfig?.isDoneStatus ?? false;

    // Get previous lane to check if we're moving from a done lane
    const previousLane = draggedItem.roadmapLane;
    const previousLaneConfig = laneConfigs.find((l) => l.id === previousLane);
    const wasInDoneLane = previousLaneConfig?.isDoneStatus ?? false;

    // Update the feedback item's roadmap fields
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

    z.mutate.feedback.update(updateData);
  };

  // Build lane display config including backlog
  const allLaneConfigs = useMemo(() => {
    const backlogConfig: LaneConfig = {
      id: "backlog",
      label: "Backlog",
      color: "#f59e0b",
      bgColor: "bg-amber-50 dark:bg-amber-950",
      isDoneStatus: false,
      laneOrder: -1,
    };
    return isAdmin ? [backlogConfig, ...laneConfigs] : laneConfigs;
  }, [laneConfigs, isAdmin]);

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      sensors={sensors}
    >
      <div
        className="grid grid-cols-1 gap-4"
        style={{
          gridTemplateColumns: `repeat(${allLaneConfigs.length}, minmax(0, 1fr))`,
        }}
      >
        {allLaneConfigs.map((laneConfig) => (
          <RoadmapLaneColumn
            isAdmin={isAdmin}
            items={itemsByLane[laneConfig.id] ?? []}
            key={laneConfig.id}
            lane={laneConfig.id as RoadmapLaneWithBacklog}
            laneConfig={laneConfig}
          />
        ))}
      </div>

      <DragOverlay>
        {activeItem ? <RoadmapItemCard isDragging item={activeItem} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
