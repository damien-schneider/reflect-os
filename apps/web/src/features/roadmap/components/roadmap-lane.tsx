import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CheckCircle } from "lucide-react";
import { RoadmapItemCard } from "@/features/roadmap/components/roadmap-item-card";
import type {
  LaneConfig,
  RoadmapFeedbackItem,
} from "@/features/roadmap/components/roadmap-kanban";
import { LANE_CONFIG, type RoadmapLaneWithBacklog } from "@/lib/constants";
import { cn } from "@/lib/utils";

type RoadmapLaneColumnProps = {
  lane: RoadmapLaneWithBacklog | string;
  items: RoadmapFeedbackItem[];
  isAdmin?: boolean;
  /** Custom lane configuration - if not provided, uses default LANE_CONFIG */
  laneConfig?: LaneConfig;
};

export function RoadmapLaneColumn({
  lane,
  items,
  isAdmin = false,
  laneConfig,
}: RoadmapLaneColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: lane,
  });

  // Use custom config if provided, otherwise fall back to default
  const config = laneConfig ?? LANE_CONFIG[lane as RoadmapLaneWithBacklog];

  if (!config) {
    console.warn(`No lane config found for lane: ${lane}`);
    return null;
  }

  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col rounded-lg border bg-muted/30",
        isOver && "ring-2 ring-primary/50"
      )}
      ref={setNodeRef}
    >
      {/* Lane Header */}
      <div className="flex items-center gap-2 rounded-t-lg border-b bg-muted/50 p-4">
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: config.color }}
        />
        <h3 className="font-semibold">{config.label}</h3>
        {laneConfig?.isDoneStatus && (
          <CheckCircle className="h-4 w-4 text-green-600" />
        )}
        <span className="ml-auto text-muted-foreground text-sm">
          {items.length}
        </span>
      </div>

      {/* Lane Content */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
              {isAdmin ? "Drag items here" : "No items"}
            </div>
          ) : (
            items.map((item) => (
              <RoadmapItemCard isAdmin={isAdmin} item={item} key={item.id} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
