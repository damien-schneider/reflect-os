import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Pin, Lock } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Separator } from "../../../components/ui/separator";
import {
  VoteButton,
  StatusBadge,
  TagSelector,
  CommentThread,
} from "../../../components/feedback";
import { AddToRoadmap } from "../../../components/roadmap";
import { TiptapRenderer } from "../../../components/editor/tiptap-editor";
import { authClient } from "../../../lib/auth-client";
import type { Schema } from "../../../schema";

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
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Feedback not found</p>
      </div>
    );
  }

  const selectedTagIds = feedback.feedbackTags?.map((ft) => ft.tag?.id ?? "").filter(Boolean) ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Button variant="ghost" asChild className="gap-2">
        <Link to="/$orgSlug/$boardSlug" params={{ orgSlug, boardSlug }}>
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
            voteCount={feedback.voteCount ?? 0}
            size="lg"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <StatusBadge status={feedback.status ?? "open"} />
              {feedback.isPinned && (
                <span className="flex items-center gap-1 text-xs text-primary">
                  <Pin className="h-3 w-3" />
                  Pinned
                </span>
              )}
              {!feedback.isApproved && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Pending approval
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold">{feedback.title}</h1>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Link
                to="/u/$userId"
                params={{ userId: feedback.authorId }}
                className="hover:text-foreground"
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
              voteCount={feedback.voteCount ?? 0}
              size="md"
            />
          </div>

          {/* Tags */}
          <TagSelector
            feedbackId={feedback.id}
            organizationId={org?.id ?? ""}
            selectedTagIds={selectedTagIds}
            editable={isOrgMember}
          />

          {/* Admin Actions */}
          {isOrgMember && (
            <div className="flex gap-2">
              <AddToRoadmap
                feedbackId={feedback.id}
                currentLane={feedback.roadmapLane}
              />
            </div>
          )}

          {/* Description */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <TiptapRenderer content={feedback.description} />
          </div>

          <Separator />

          {/* Admin notes (only for org members) */}
          {isOrgMember && Array.isArray(adminNotes) && adminNotes.length > 0 && (
            <div className="space-y-3 p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Private Notes
              </h3>
              {(adminNotes as { id: string; body: string; createdAt: number; author?: { name: string } }[]).map((note) => (
                <div key={note.id} className="text-sm">
                  <div className="text-xs text-muted-foreground mb-1">
                    {note.author?.name} •{" "}
                    {formatDistanceToNow(note.createdAt, { addSuffix: true })}
                  </div>
                  <p>{note.body}</p>
                </div>
              ))}
            </div>
          )}

          {/* Comments */}
          <CommentThread
            feedbackId={feedback.id}
            isOrgMember={isOrgMember}
          />
        </div>
      </div>
    </div>
  );
}
