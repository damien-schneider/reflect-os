import { cn } from "@repo/ui/lib/utils";
import { ChevronUp, ExternalLink, GripVertical } from "lucide-react";
import type { RoadmapFeedbackItem } from "@/features/roadmap/components/roadmap-kanban";

type RoadmapItemCardProps = {
  item: RoadmapFeedbackItem;
  isAdmin?: boolean;
  isDragging?: boolean;
  onDragStart?: (
    e: React.DragEvent<HTMLDivElement>,
    item: RoadmapFeedbackItem
  ) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
};

export function RoadmapItemCard({
  item,
  isAdmin = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
}: RoadmapItemCardProps) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isAdmin) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.id);
    onDragStart?.(e, item);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    onDragEnd?.(e);
  };

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: This is a draggable card for drag-and-drop functionality
    // biome-ignore lint/a11y/noStaticElementInteractions: This is a draggable card for drag-and-drop functionality
    <div
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm transition-opacity",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary",
        isAdmin && "cursor-grab active:cursor-grabbing",
        !isAdmin && "cursor-default"
      )}
      draggable={isAdmin}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      role={isAdmin ? "button" : undefined}
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle (admin only) */}
        {isAdmin && (
          <div className="mt-0.5 touch-none">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Title */}
          <h4 className="line-clamp-2 font-medium text-sm">{item.title}</h4>

          {/* Description preview */}
          {item.description && (
            <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
              {stripHtml(item.description)}
            </p>
          )}

          {/* Footer */}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1 text-muted-foreground">
              <ChevronUp className="h-3 w-3" />
              <span className="text-xs">{item.voteCount}</span>
            </div>

            <span className="flex items-center gap-1 text-muted-foreground text-xs">
              View
              <ExternalLink className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to strip HTML tags for preview
function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}
