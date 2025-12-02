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
import { authClient } from "../../lib/auth-client";
import { cn } from "../../lib/utils";
import { randID } from "../../rand";
import type { Comment, Schema } from "../../schema";
import { MarkdownEditor } from "../editor-new/markdown-editor";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

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
  const z = useZero<Schema>();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  // Get all comments for the feedback
  const [comments] = useQuery(
    z.query.comment
      .where("feedbackId", "=", feedbackId)
      .where("parentId", "IS", null)
      .related("author")
      .related("replies", (q) => q.related("author"))
  );

  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitComment = async () => {
    if (!(newComment.trim() && userId)) return;

    setIsSubmitting(true);
    try {
      await z.mutate.comment.insert({
        id: randID(),
        feedbackId,
        authorId: userId,
        body: newComment,
        isOfficial: isOrgMember,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Update comment count
      const [feedback] = await z.query.feedback
        .where("id", "=", feedbackId)
        .run();
      if (feedback) {
        await z.mutate.feedback.update({
          id: feedbackId,
          commentCount: (feedback.commentCount ?? 0) + 1,
        });
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
            className="min-h-[80px]"
            onChange={setNewComment}
            placeholder="Write a comment... Press '/' for commands"
            showDragHandle={false}
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
        <p className="border-t py-4 text-center text-muted-foreground text-sm">
          Please sign in to leave a comment
        </p>
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
  const z = useZero<Schema>();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.body);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  const isAuthor = currentUserId === comment.authorId;
  const canEdit = isAuthor || isOrgMember;

  const handleSaveEdit = async () => {
    await z.mutate.comment.update({
      id: comment.id,
      body: editContent,
      updatedAt: Date.now(),
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await z.mutate.comment.delete({ id: comment.id });
    // Update comment count
    const [feedback] = await z.query.feedback
      .where("id", "=", feedbackId)
      .run();
    if (feedback) {
      await z.mutate.feedback.update({
        id: feedbackId,
        commentCount: Math.max(0, (feedback.commentCount ?? 1) - 1),
      });
    }
  };

  const handleReply = async () => {
    if (!(replyContent.trim() && currentUserId)) return;

    await z.mutate.comment.insert({
      id: randID(),
      feedbackId,
      authorId: currentUserId,
      body: replyContent,
      isOfficial: isOrgMember,
      parentId: comment.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    setReplyContent("");
    setShowReplyForm(false);
  };

  return (
    <div className={cn("space-y-3", depth > 0 && "ml-8 border-l-2 pl-4")}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
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
                showDragHandle={false}
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
                editorClassName="border-none shadow-none px-0 min-h-0 [&_.ProseMirror]:min-h-0"
                showDragHandle={false}
                showSlashMenu={false}
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
                  <DropdownMenuTrigger asChild>
                    <Button className="h-7 w-7 p-0" size="sm" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
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
                placeholder="Write a reply..."
                showDragHandle={false}
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
