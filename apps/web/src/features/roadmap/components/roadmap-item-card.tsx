import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronUp, ExternalLink, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoadmapFeedbackItem } from "./roadmap-kanban";

type RoadmapItemCardProps = {
  item: RoadmapFeedbackItem;
  isAdmin?: boolean;
  isDragging?: boolean;
};

export function RoadmapItemCard({
  item,
  isAdmin = false,
  isDragging = false,
}: RoadmapItemCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: item.id,
    disabled: !isAdmin,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm",
        (isDragging || isSortableDragging) &&
          "opacity-50 shadow-lg ring-2 ring-primary",
        !isAdmin && "cursor-default"
      )}
      ref={setNodeRef}
      style={style}
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle (admin only) */}
        {isAdmin && (
          <button
            className="mt-0.5 cursor-grab touch-none active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
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
