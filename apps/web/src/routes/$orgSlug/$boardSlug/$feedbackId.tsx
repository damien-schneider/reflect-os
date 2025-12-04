import { useQuery, useZero } from "@rocicorp/zero/react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Lock, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MarkdownEditor } from "@/features/editor/components/markdown-editor";
import { CommentThread } from "@/features/feedback/components/comment-thread";
import { StatusBadge } from "@/features/feedback/components/status-badge";
import { TagSelector } from "@/features/feedback/components/tag-selector";
import { VoteButton } from "@/features/feedback/components/vote-button";
import { AddToRoadmap } from "@/features/roadmap/components/add-to-roadmap";
import { authClient } from "@/lib/auth-client";
import type { Schema } from "@/schema";

export const Route = createFileRoute("/$orgSlug/$boardSlug/$feedbackId")({
  component: FeedbackDetail,
});

function FeedbackDetail() {
  const { orgSlug, boardSlug, feedbackId } = useParams({ strict: false }) as {
    orgSlug: string;
    boardSlug: string;
    feedbackId: string;
  };
  const z = useZero<Schema>();
  const { data: session } = authClient.useSession();

  // Get organization
  const [orgs] = useQuery(z.query.organization.where("slug", "=", orgSlug));
  const org = orgs?.[0];

  // Get board
  const [boards] = useQuery(
    z.query.board
      .where("organizationId", "=", org?.id ?? "")
      .where("slug", "=", boardSlug)
  );
  const board = boards?.[0];

  // Check if user is org member
  const [members] = useQuery(
    z.query.member
      .where("organizationId", "=", org?.id ?? "")
      .where("userId", "=", session?.user?.id ?? "")
  );
  const isOrgMember = members && members.length > 0;

  // Get feedback with related data
  const [feedbacks] = useQuery(
    z.query.feedback
      .where("id", "=", feedbackId)
      .related("author")
      .related("feedbackTags", (q) => q.related("tag"))
  );
  const feedback = feedbacks?.[0];

  // Get admin notes (only visible to org members)
  const [adminNotes] = useQuery(
    isOrgMember
      ? z.query.adminNote
          .where("feedbackId", "=", feedbackId)
          .orderBy("createdAt", "desc")
          .related("author")
      : z.query.adminNote.where("id", "=", "") // Empty query if not member
  );

  // User is org member for admin note visibility

  if (!feedback) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Feedback not found</p>
      </div>
    );
  }

  const selectedTagIds =
    feedback.feedbackTags?.map((ft) => ft.tag?.id ?? "").filter(Boolean) ?? [];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Button asChild className="gap-2" variant="ghost">
        <Link params={{ orgSlug, boardSlug }} to="/$orgSlug/$boardSlug">
          <ArrowLeft className="h-4 w-4" />
          Back to {board?.name ?? "Board"}
        </Link>
      </Button>

      {/* Main content */}
      <div className="flex gap-6">
        {/* Vote button - sidebar on larger screens */}
        <div className="hidden md:block">
          <VoteButton
            feedbackId={feedback.id}
            size="lg"
            voteCount={feedback.voteCount ?? 0}
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Header */}
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={feedback.status ?? "open"} />
              {feedback.isPinned && (
                <span className="flex items-center gap-1 text-primary text-xs">
                  <Pin className="h-3 w-3" />
                  Pinned
                </span>
              )}
              {!feedback.isApproved && (
                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Lock className="h-3 w-3" />
                  Pending approval
                </span>
              )}
            </div>
            <h1 className="font-bold text-2xl">{feedback.title}</h1>
            <div className="mt-2 flex items-center gap-2 text-muted-foreground text-sm">
              <Link
                className="hover:text-foreground"
                params={{ userId: feedback.authorId }}
                to="/u/$userId"
              >
                {feedback.author?.name ?? "Unknown User"}
              </Link>
              <span>•</span>
              <span>
                {formatDistanceToNow(feedback.createdAt, { addSuffix: true })}
              </span>
              {feedback.updatedAt > feedback.createdAt && (
                <>
                  <span>•</span>
                  <span>edited</span>
                </>
              )}
            </div>
          </div>

          {/* Mobile vote button */}
          <div className="md:hidden">
            <VoteButton
              feedbackId={feedback.id}
              size="md"
              voteCount={feedback.voteCount ?? 0}
            />
          </div>

          {/* Tags */}
          <TagSelector
            editable={isOrgMember}
            feedbackId={feedback.id}
            organizationId={org?.id ?? ""}
            selectedTagIds={selectedTagIds}
          />

          {/* Admin Actions */}
          {isOrgMember && (
            <div className="flex gap-2">
              <AddToRoadmap
                currentLane={feedback.roadmapLane}
                feedbackId={feedback.id}
              />
            </div>
          )}

          {/* Description */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <MarkdownEditor
              editable={false}
              editorClassName="border-none shadow-none px-0 min-h-0 [&_.ProseMirror]:min-h-0"
              showToolbar={false}
              value={feedback.description}
            />
          </div>

          <Separator />

          {/* Admin notes (only for org members) */}
          {isOrgMember &&
            Array.isArray(adminNotes) &&
            adminNotes.length > 0 && (
              <div className="space-y-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/30">
                <h3 className="flex items-center gap-2 font-semibold text-sm">
                  <Lock className="h-4 w-4" />
                  Private Notes
                </h3>
                {(
                  adminNotes as {
                    id: string;
                    body: string;
                    createdAt: number;
                    author?: { name: string };
                  }[]
                ).map((note) => (
                  <div className="text-sm" key={note.id}>
                    <div className="mb-1 text-muted-foreground text-xs">
                      {note.author?.name} •{" "}
                      {formatDistanceToNow(note.createdAt, { addSuffix: true })}
                    </div>
                    <p>{note.body}</p>
                  </div>
                ))}
              </div>
            )}

          {/* Comments */}
          <CommentThread feedbackId={feedback.id} isOrgMember={isOrgMember} />
        </div>
      </div>
    </div>
  );
}
