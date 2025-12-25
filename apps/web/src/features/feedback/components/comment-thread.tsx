import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { cn } from "@repo/ui/lib/utils";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { formatDistanceToNow } from "date-fns";
import {
  Edit,
  MessageSquare,
  MoreHorizontal,
  Shield,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useAuthDialog } from "@/components/auth-dialog-provider";
import { MarkdownEditor } from "@/features/editor/components/markdown-editor";
import { authClient } from "@/lib/auth-client";
import { mutators } from "@/mutators";
import { queries } from "@/queries";
import { randID } from "@/rand";
import type { Comment } from "@/zero-schema";
// Note: zql is kept for imperative zero.run() calls only
import { zql } from "@/zero-schema";

type CommentWithRelations = Comment & {
  author?: { id: string; name: string } | null;
  replies?: readonly (Comment & {
    author?: { id: string; name: string } | null;
  })[];
};

interface CommentThreadProps {
  feedbackId: string;
  isOrgMember?: boolean;
  className?: string;
}

export function CommentThread({
  feedbackId,
  isOrgMember = false,
  className,
}: CommentThreadProps) {
  const zero = useZero();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  const { openAuthDialog } = useAuthDialog();

  // Get all comments for the feedback
  // Using named query for reactive updates
  const [comments] = useQuery(
    queries.comment.topLevelByFeedbackId({ feedbackId })
  );

  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitComment = async () => {
    if (!(newComment.trim() && userId)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await zero.mutate(
        mutators.comment.insert({
          id: randID(),
          feedbackId,
          authorId: userId,
          body: newComment,
          isOfficial: isOrgMember,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      );

      // Update comment count
      const [feedback] = await zero.run(zql.feedback.where("id", feedbackId));
      if (feedback) {
        await zero.mutate(
          mutators.feedback.update({
            id: feedbackId,
            commentCount: (feedback.commentCount ?? 0) + 1,
          })
        );
      }

      setNewComment("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        <h3 className="font-semibold">Comments ({comments?.length ?? 0})</h3>
      </div>

      {/* Comment list */}
      <div className="space-y-4">
        {(comments as CommentWithRelations[] | undefined)?.map((comment) => (
          <CommentItem
            comment={comment}
            currentUserId={userId}
            feedbackId={feedbackId}
            isOrgMember={isOrgMember}
            key={comment.id}
          />
        ))}

        {(!comments || comments.length === 0) && (
          <p className="py-4 text-center text-muted-foreground text-sm">
            No comments yet. Be the first to share your thoughts!
          </p>
        )}
      </div>

      {/* New comment form */}
      {userId ? (
        <div className="space-y-3 border-t pt-4">
          <MarkdownEditor
            className="min-h-20"
            onChange={setNewComment}
            value={newComment}
          />
          <div className="flex items-center justify-between">
            {isOrgMember && (
              <Badge className="gap-1" variant="outline">
                <Shield className="h-3 w-3" />
                Official response
              </Badge>
            )}
            <div className="flex-1" />
            <Button
              disabled={!newComment.trim() || isSubmitting}
              onClick={handleSubmitComment}
            >
              {isSubmitting ? "Posting..." : "Post Comment"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t py-4 text-center">
          <p className="mb-3 text-muted-foreground text-sm">
            Sign in to leave a comment
          </p>
          <Button onClick={openAuthDialog} variant="outline">
            Sign In
          </Button>
        </div>
      )}
    </div>
  );
}

interface CommentItemProps {
  comment: Comment & {
    author?: { id: string; name: string } | null;
    replies?: readonly (Comment & {
      author?: { id: string; name: string } | null;
    })[];
  };
  feedbackId: string;
  isOrgMember: boolean;
  currentUserId?: string;
  depth?: number;
}

function CommentItem({
  comment,
  feedbackId,
  isOrgMember,
  currentUserId,
  depth = 0,
}: CommentItemProps) {
  const zero = useZero();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.body);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  const isAuthor = currentUserId === comment.authorId;
  const canEdit = isAuthor || isOrgMember;

  const handleSaveEdit = async () => {
    await zero.mutate(
      mutators.comment.update({
        id: comment.id,
        body: editContent,
        updatedAt: Date.now(),
      })
    );
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await zero.mutate(mutators.comment.delete({ id: comment.id }));
    // Update comment count
    const [feedback] = await zero.run(zql.feedback.where("id", feedbackId));
    if (feedback) {
      await zero.mutate(
        mutators.feedback.update({
          id: feedbackId,
          commentCount: Math.max(0, (feedback.commentCount ?? 1) - 1),
        })
      );
    }
  };

  const handleReply = async () => {
    if (!(replyContent.trim() && currentUserId)) {
      return;
    }

    await zero.mutate(
      mutators.comment.insert({
        id: randID(),
        feedbackId,
        authorId: currentUserId,
        body: replyContent,
        isOfficial: isOrgMember,
        parentId: comment.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    setReplyContent("");
    setShowReplyForm(false);
  };

  return (
    <div className={cn("space-y-3", depth > 0 && "ml-8 border-l-2 pl-4")}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <span className="font-medium text-sm">
            {comment.author?.name?.charAt(0).toUpperCase() ?? "?"}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-sm">
              {comment.author?.name ?? "Unknown User"}
            </span>
            {comment.isOfficial && (
              <Badge className="gap-1 text-xs" variant="default">
                <Shield className="h-3 w-3" />
                Official
              </Badge>
            )}
            <span className="text-muted-foreground text-xs">
              {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
            </span>
            {comment.updatedAt > comment.createdAt && (
              <span className="text-muted-foreground text-xs">(edited)</span>
            )}
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <MarkdownEditor
                className="min-h-[60px]"
                onChange={setEditContent}
                value={editContent}
              />
              <div className="flex gap-2">
                <Button onClick={handleSaveEdit} size="sm">
                  Save
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.body);
                  }}
                  size="sm"
                  variant="ghost"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-1">
              <MarkdownEditor
                editable={false}
                showToolbar={false}
                value={comment.body}
              />
            </div>
          )}

          {/* Actions */}
          {!isEditing && currentUserId && (
            <div className="mt-2 flex items-center gap-2">
              {depth === 0 && (
                <Button
                  className="h-7 text-xs"
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  size="sm"
                  variant="ghost"
                >
                  Reply
                </Button>
              )}

              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        className="h-7 w-7 p-0"
                        size="sm"
                        variant="ghost"
                      />
                    }
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={handleDelete}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}

          {/* Reply form */}
          {showReplyForm && (
            <div className="mt-3 space-y-2">
              <MarkdownEditor
                className="min-h-[60px]"
                onChange={setReplyContent}
                value={replyContent}
              />
              <div className="flex gap-2">
                <Button onClick={handleReply} size="sm">
                  Reply
                </Button>
                <Button
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyContent("");
                  }}
                  size="sm"
                  variant="ghost"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              comment={reply}
              currentUserId={currentUserId}
              depth={depth + 1}
              feedbackId={feedbackId}
              isOrgMember={isOrgMember}
              key={reply.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
