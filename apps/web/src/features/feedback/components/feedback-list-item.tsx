import { Badge } from "@repo/ui/components/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@repo/ui/components/context-menu";
import { cn } from "@repo/ui/lib/utils";
import { useZero } from "@rocicorp/zero/react";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Pin, Trash2 } from "lucide-react";
import { useCallback } from "react";
import { StatusBadge } from "@/features/feedback/components/status-badge";
import { VoteButton } from "@/features/feedback/components/vote-button";
import { authClient } from "@/lib/auth-client";
import { mutators } from "@/mutators";
import type { Feedback, Tag } from "@/schema";

interface FeedbackListItemProps {
  feedback: Feedback & {
    author?: { id: string; name: string } | null;
    // Support both direct tags array (from named query) and feedbackTags junction table
    tags?: readonly (Tag | null | undefined)[];
    feedbackTags?: readonly { tag: Tag | null | undefined }[];
  };
  orgSlug: string;
  boardSlug: string;
  className?: string;
  /** Whether the current user is an admin of this board */
  isAdmin?: boolean;
}

export function FeedbackListItem({
  feedback,
  orgSlug,
  boardSlug,
  className,
  isAdmin = false,
}: FeedbackListItemProps) {
  const zero = useZero();
  const { data: session } = authClient.useSession();

  // Support both data shapes - direct tags array or feedbackTags junction table
  const tags = (
    feedback.tags ??
    feedback.feedbackTags?.map((ft) => ft.tag) ??
    []
  ).filter((t): t is Tag => t !== null && t !== undefined);

  // Check if user can delete this feedback (author or admin)
  const isAuthor = session?.user?.id === feedback.authorId;
  const canDelete = isAuthor || isAdmin;

  const handleDelete = useCallback(async () => {
    if (!canDelete) {
      return;
    }

    // Confirm before deleting
    if (
      // biome-ignore lint/suspicious/noAlert: Simple confirmation for destructive action
      !window.confirm(
        `Are you sure you want to delete "${feedback.title}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await zero.mutate(mutators.feedback.delete({ id: feedback.id }));
    } catch (error) {
      console.error("Failed to delete feedback:", error);
    }
  }, [canDelete, feedback.id, feedback.title, zero]);

  return (
    <ContextMenu>
      <ContextMenuTrigger
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
                search={{ modal: true }}
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
      </ContextMenuTrigger>
      {canDelete && (
        <ContextMenuContent>
          <ContextMenuItem onClick={handleDelete} variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
}
