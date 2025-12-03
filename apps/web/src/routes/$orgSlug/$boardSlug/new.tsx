import { useQuery, useZero } from "@rocicorp/zero/react";
import {
  createFileRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuthDialog } from "@/components/auth-dialog-provider";
import { MarkdownEditor } from "@/features/editor/components/markdown-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { randID } from "@/rand";
import type { Schema } from "@/schema";

const MAX_VERIFY_ATTEMPTS = 10;
const VERIFY_DELAY_MS = 300;

export const Route = createFileRoute("/$orgSlug/$boardSlug/new")({
  component: NewFeedback,
});

function NewFeedback() {
  const { orgSlug, boardSlug } = useParams({ strict: false }) as {
    orgSlug: string;
    boardSlug: string;
  };
  const navigate = useNavigate();
  const z = useZero<Schema>();
  const { data: session } = authClient.useSession();
  const { openAuthDialog } = useAuthDialog();

  // Get organization and board
  const [orgs] = useQuery(z.query.organization.where("slug", "=", orgSlug));
  const org = orgs?.[0];

  const [boards] = useQuery(
    z.query.board
      .where("organizationId", "=", org?.id ?? "")
      .where("slug", "=", boardSlug)
  );
  const board = boards?.[0];

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    if (!session?.user?.id) {
      setError("You must be logged in to submit feedback");
      return;
    }

    if (!board) {
      setError("Board not found");
      return;
    }

    setIsSubmitting(true);

    try {
      const feedbackId = randID();
      const requiresApproval = board.settings?.requireApproval ?? false;

      console.log("[NewFeedback] Creating feedback:", {
        feedbackId,
        boardId: board.id,
        authorId: session.user.id,
        requiresApproval,
      });

      await z.mutate.feedback.insert({
        id: feedbackId,
        boardId: board.id,
        title: title.trim(),
        description,
        status: board.settings?.defaultStatus ?? "open",
        authorId: session.user.id,
        voteCount: 0,
        commentCount: 0,
        isApproved: !requiresApproval,
        isPinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      console.log("[NewFeedback] Mutation completed, verifying creation...");

      // Verify the feedback was actually created before navigating
      let verified = false;
      for (let i = 0; i < MAX_VERIFY_ATTEMPTS; i++) {
        const [result] = await z.query.feedback
          .where("id", "=", feedbackId)
          .run();

        if (result) {
          console.log("[NewFeedback] ✅ Feedback verified:", result.id);
          verified = true;
          break;
        }

        console.log(
          `[NewFeedback] Attempt ${i + 1}/${MAX_VERIFY_ATTEMPTS}: Feedback not found yet, waiting...`
        );
        await new Promise((resolve) => setTimeout(resolve, VERIFY_DELAY_MS));
      }

      if (!verified) {
        console.error(
          "[NewFeedback] ❌ Feedback creation failed - could not verify after",
          MAX_VERIFY_ATTEMPTS,
          "attempts"
        );
        setError(
          "Failed to create feedback. This may be a permission issue. Please try again or contact support."
        );
        setIsSubmitting(false);
        return;
      }

      // Navigate to the new feedback
      navigate({
        to: "/$orgSlug/$boardSlug/$feedbackId",
        params: { orgSlug, boardSlug, feedbackId },
      });
    } catch (err) {
      console.error("[NewFeedback] ❌ Error creating feedback:", err);
      setError(
        err instanceof Error
          ? `Failed to submit feedback: ${err.message}`
          : "Failed to submit feedback. Please try again."
      );
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <p className="mb-4 text-muted-foreground">
          You must be logged in to submit feedback.
        </p>
        <Button onClick={openAuthDialog}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back link */}
      <Button
        className="gap-2"
        onClick={() =>
          navigate({
            to: "/$orgSlug/$boardSlug",
            params: { orgSlug, boardSlug },
          })
        }
        variant="ghost"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {board?.name ?? "Board"}
      </Button>

      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl">Submit Feedback</h1>
        <p className="mt-1 text-muted-foreground">
          Share your ideas, suggestions, or report issues
        </p>
      </div>

      {/* Form */}
      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            disabled={isSubmitting}
            id="title"
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief summary of your feedback"
            value={title}
          />
          <p className="text-muted-foreground text-xs">
            {title.length}/200 characters
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          {isSubmitting ? (
            <div className="min-h-[200px] w-full rounded-lg border border-input bg-muted/50 px-4 py-3">
              <p className="text-muted-foreground text-sm">
                {description || "No description provided"}
              </p>
            </div>
          ) : (
            <MarkdownEditor
              className="min-h-[200px]"
              editable
              onChange={setDescription}
              placeholder="Provide more details about your feedback... Press '/' for commands"
              showDragHandle={false}
              value={description}
            />
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button
            disabled={isSubmitting}
            onClick={() =>
              navigate({
                to: "/$orgSlug/$boardSlug",
                params: { orgSlug, boardSlug },
              })
            }
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
