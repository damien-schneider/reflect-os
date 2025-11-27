import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CheckCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import { type RoadmapLane, type RoadmapLaneWithBacklog, LANE_CONFIG } from "../../lib/constants";
import { RoadmapItemCard } from "./roadmap-item-card";
import type { LaneConfig } from "./roadmap-kanban";

// Feedback item with roadmap fields
interface RoadmapFeedbackItem {
  id: string;
  title: string;
  description: string;
  status: string;
  voteCount: number;
  roadmapLane: RoadmapLane | string | null;
  roadmapOrder: number;
  completedAt?: number | null;
}

interface RoadmapLaneColumnProps {
  lane: RoadmapLaneWithBacklog | string;
  items: RoadmapFeedbackItem[];
  isAdmin?: boolean;
  /** Custom lane configuration - if not provided, uses default LANE_CONFIG */
  laneConfig?: LaneConfig;
}

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
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border bg-muted/30 min-h-[400px]",
        isOver && "ring-2 ring-primary/50"
      )}
    >
      {/* Lane Header */}
      <div className="flex items-center gap-2 p-4 border-b bg-muted/50 rounded-t-lg">
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: config.color }}
        />
        <h3 className="font-semibold">{config.label}</h3>
        {laneConfig?.isDoneStatus && (
          <CheckCircle className="h-4 w-4 text-green-600" />
        )}
        <span className="text-muted-foreground text-sm ml-auto">
          {items.length}
        </span>
      </div>

      {/* Lane Content */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              {isAdmin ? "Drag items here" : "No items"}
            </div>
          ) : (
            items.map((item) => (
              <RoadmapItemCard key={item.id} item={item} isAdmin={isAdmin} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
