import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronUp, ExternalLink } from "lucide-react";
import { cn } from "../../lib/utils";
import { type RoadmapLane } from "../../lib/constants";

// Feedback item with roadmap fields
interface RoadmapFeedbackItem {
  id: string;
  title: string;
  description: string;
  status: string;
  voteCount: number;
  roadmapLane: RoadmapLane | null;
  roadmapOrder: number;
}

interface RoadmapItemCardProps {
  item: RoadmapFeedbackItem;
  isAdmin?: boolean;
  isDragging?: boolean;
}

export function RoadmapItemCard({ item, isAdmin = false, isDragging = false }: RoadmapItemCardProps) {
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
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm",
        (isDragging || isSortableDragging) && "opacity-50 shadow-lg ring-2 ring-primary",
        !isAdmin && "cursor-default"
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle (admin only) */}
        {isAdmin && (
          <button
            className="mt-0.5 cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        )}

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="font-medium text-sm line-clamp-2">
            {item.title}
          </h4>

          {/* Description preview */}
          {item.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {stripHtml(item.description)}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <ChevronUp className="h-3 w-3" />
              <span className="text-xs">{item.voteCount}</span>
            </div>

            <span className="text-xs text-muted-foreground flex items-center gap-1">
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
