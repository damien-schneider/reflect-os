import { useState } from "react";
import { useZero, useQuery } from "@rocicorp/zero/react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Shield, MoreHorizontal, Trash2, Edit } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { TiptapEditor, TiptapRenderer } from "../editor/tiptap-editor";
import { authClient } from "../../lib/auth-client";
import { cn } from "../../lib/utils";
import type { Schema, Comment } from "../../schema";
import { randID } from "../../rand";

type CommentWithRelations = Comment & {
  author?: { id: string; name: string } | null;
  replies?: readonly (Comment & { author?: { id: string; name: string } | null })[];
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
    if (!newComment.trim() || !userId) return;

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
      const [feedback] = await z.query.feedback.where("id", "=", feedbackId).run();
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
            key={comment.id}
            comment={comment}
            feedbackId={feedbackId}
            isOrgMember={isOrgMember}
            currentUserId={userId}
          />
        ))}

        {(!comments || comments.length === 0) && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No comments yet. Be the first to share your thoughts!
          </p>
        )}
      </div>

      {/* New comment form */}
      {userId ? (
        <div className="space-y-3 pt-4 border-t">
          <TiptapEditor
            content={newComment}
            onChange={setNewComment}
            placeholder="Write a comment..."
            minHeight="80px"
          />
          <div className="flex justify-between items-center">
            {isOrgMember && (
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" />
                Official response
              </Badge>
            )}
            <div className="flex-1" />
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
            >
              {isSubmitting ? "Posting..." : "Post Comment"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4 border-t">
          Please sign in to leave a comment
        </p>
      )}
    </div>
  );
}

interface CommentItemProps {
  comment: Comment & { author?: { id: string; name: string } | null; replies?: readonly (Comment & { author?: { id: string; name: string } | null })[] };
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
    const [feedback] = await z.query.feedback.where("id", "=", feedbackId).run();
    if (feedback) {
      await z.mutate.feedback.update({
        id: feedbackId,
        commentCount: Math.max(0, (feedback.commentCount ?? 1) - 1),
      });
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !currentUserId) return;

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
    <div className={cn("space-y-3", depth > 0 && "ml-8 pl-4 border-l-2")}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-medium">
            {comment.author?.name?.charAt(0).toUpperCase() ?? "?"}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">
              {comment.author?.name ?? "Unknown User"}
            </span>
            {comment.isOfficial && (
              <Badge variant="default" className="gap-1 text-xs">
                <Shield className="h-3 w-3" />
                Official
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
            </span>
            {comment.updatedAt > comment.createdAt && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <TiptapEditor
                content={editContent}
                onChange={setEditContent}
                minHeight="60px"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.body);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-1">
              <TiptapRenderer content={comment.body} />
            </div>
          )}

          {/* Actions */}
          {!isEditing && currentUserId && (
            <div className="flex items-center gap-2 mt-2">
              {depth === 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="h-7 text-xs"
                >
                  Reply
                </Button>
              )}

              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
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
              <TiptapEditor
                content={replyContent}
                onChange={setReplyContent}
                placeholder="Write a reply..."
                minHeight="60px"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleReply}>
                  Reply
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyContent("");
                  }}
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
              key={reply.id}
              comment={reply}
              feedbackId={feedbackId}
              isOrgMember={isOrgMember}
              currentUserId={currentUserId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
