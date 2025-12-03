import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/features/feedback/components/status-badge";
import { VoteButton } from "@/features/feedback/components/vote-button";
import { cn } from "@/lib/utils";
import type { Feedback, Tag } from "@/schema";

type FeedbackListItemProps = {
  feedback: Feedback & {
    author?: { id: string; name: string } | null;
    feedbackTags?: readonly { tag: Tag | null | undefined }[];
  };
  orgSlug: string;
  boardSlug: string;
  className?: string;
};

export function FeedbackListItem({
  feedback,
  orgSlug,
  boardSlug,
  className,
}: FeedbackListItemProps) {
  const tags =
    feedback.feedbackTags
      ?.map((ft) => ft.tag)
      .filter((t): t is Tag => t !== null) ?? [];

  return (
    <div
      className={cn(
        "flex gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50",
        feedback.isPinned && "border-primary/50 bg-primary/5",
        className
      )}
    >
      {/* Vote button */}
      <VoteButton
        feedbackId={feedback.id}
        size="md"
        voteCount={feedback.voteCount ?? 0}
      />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Title */}
            <Link
              className="group"
              params={{ orgSlug, boardSlug, feedbackId: feedback.id }}
              to="/$orgSlug/$boardSlug/$feedbackId"
            >
              <h3 className="line-clamp-2 font-semibold text-base transition-colors group-hover:text-primary">
                {feedback.isPinned && (
                  <Pin className="mr-1 inline h-4 w-4 text-primary" />
                )}
                {feedback.title}
              </h3>
            </Link>

            {/* Meta info */}
            <div className="mt-1 flex items-center gap-2 text-muted-foreground text-sm">
              <span>{feedback.author?.name ?? "Unknown"}</span>
              <span>•</span>
              <span>
                {formatDistanceToNow(feedback.createdAt, { addSuffix: true })}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {feedback.commentCount}
              </span>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge
                    className="text-xs"
                    key={tag.id}
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                    variant="secondary"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <StatusBadge status={feedback.status ?? "open"} />
        </div>
      </div>
    </div>
  );
}
