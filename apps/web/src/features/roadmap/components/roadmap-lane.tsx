import { cn } from "@repo/ui/lib/utils";
import { CheckCircle, Plus } from "lucide-react";
import { useState } from "react";
import { RoadmapItemCard } from "@/features/roadmap/components/roadmap-item-card";
import type {
  LaneConfig,
  RoadmapFeedbackItem,
} from "@/features/roadmap/components/roadmap-kanban";
import { LANE_CONFIG, type RoadmapLaneWithBacklog } from "@/lib/constants";

type RoadmapLaneColumnProps = {
  lane: RoadmapLaneWithBacklog | string;
  items: RoadmapFeedbackItem[];
  isAdmin?: boolean;
  /** Custom lane configuration - if not provided, uses default LANE_CONFIG */
  laneConfig?: LaneConfig;
  draggingItemId?: string | null;
  onDragStart?: (
    e: React.DragEvent<HTMLDivElement>,
    item: RoadmapFeedbackItem
  ) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  onAddItem?: (laneId: string) => void;
};

export function RoadmapLaneColumn({
  lane,
  items,
  isAdmin = false,
  laneConfig,
  draggingItemId,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onAddItem,
}: RoadmapLaneColumnProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Use custom config if provided, otherwise fall back to default
  const config = laneConfig ?? LANE_CONFIG[lane as RoadmapLaneWithBacklog];

  if (!config) {
    console.warn(`No lane config found for lane: ${lane}`);
    return null;
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    onDragOver?.(e);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    onDrop?.(e);
  };

  const handleAddItem = () => {
    onAddItem?.(lane);
  };

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: This is a drop zone for drag-and-drop functionality
    <section
      aria-label={`${config.label} lane`}
      className={cn(
        "group/lane flex min-h-[400px] flex-col rounded-lg border bg-muted/30 transition-all",
        draggingItemId && "ring-2 ring-dashed ring-primary/20"
      )}
      data-lane={lane}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
        {/* Add button in header (visible on hover) */}
        {isAdmin && onAddItem && (
          <button
            className={cn(
              "rounded p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground",
              isHovered ? "opacity-100" : "opacity-0"
            )}
            onClick={handleAddItem}
            type="button"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Lane Content */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {items.map((item) => (
          <RoadmapItemCard
            isAdmin={isAdmin}
            isDragging={draggingItemId === item.id}
            item={item}
            key={item.id}
            onDragEnd={onDragEnd}
            onDragStart={onDragStart}
          />
        ))}

        {/* Bottom add button (visible on hover) */}
        {isAdmin && onAddItem && (
          <button
            className={cn(
              "flex w-full items-center gap-2 rounded-lg border border-muted-foreground/30 border-dashed p-3 text-muted-foreground text-sm transition-all hover:border-primary/50 hover:bg-muted/50 hover:text-foreground",
              isHovered ? "opacity-100" : "opacity-0"
            )}
            onClick={handleAddItem}
            type="button"
          >
            <Plus className="h-4 w-4" />
            <span>New</span>
          </button>
        )}
      </div>
    </section>
  );
}
