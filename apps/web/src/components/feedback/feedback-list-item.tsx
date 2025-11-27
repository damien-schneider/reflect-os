import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Pin } from "lucide-react";
import { VoteButton } from "./vote-button";
import { StatusBadge } from "./status-badge";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";
import type { Feedback, Tag } from "../../schema";

interface FeedbackListItemProps {
  feedback: Feedback & {
    author?: { id: string; name: string } | null;
    feedbackTags?: readonly { tag: Tag | null | undefined }[];
  };
  orgSlug: string;
  boardSlug: string;
  className?: string;
}

export function FeedbackListItem({
  feedback,
  orgSlug,
  boardSlug,
  className,
}: FeedbackListItemProps) {
  const tags = feedback.feedbackTags?.map((ft) => ft.tag).filter((t): t is Tag => t !== null) ?? [];

  return (
    <div
      className={cn(
        "flex gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors",
        feedback.isPinned && "border-primary/50 bg-primary/5",
        className
      )}
    >
      {/* Vote button */}
      <VoteButton
        feedbackId={feedback.id}
        voteCount={feedback.voteCount ?? 0}
        size="md"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Title */}
            <Link
              to="/$orgSlug/$boardSlug/$feedbackId"
              params={{ orgSlug, boardSlug, feedbackId: feedback.id }}
              className="group"
            >
              <h3 className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-2">
                {feedback.isPinned && (
                  <Pin className="inline h-4 w-4 mr-1 text-primary" />
                )}
                {feedback.title}
              </h3>
            </Link>

            {/* Meta info */}
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>{feedback.author?.name ?? "Unknown"}</span>
              <span>•</span>
              <span>{formatDistanceToNow(feedback.createdAt, { addSuffix: true })}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {feedback.commentCount}
              </span>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                    className="text-xs"
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
