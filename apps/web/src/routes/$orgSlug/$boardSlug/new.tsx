import { useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { ArrowLeft } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { TiptapEditor } from "../../../components/editor/tiptap-editor";
import { authClient } from "../../../lib/auth-client";
import { randID } from "../../../rand";
import type { Schema } from "../../../schema";

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

      await z.mutate.feedback.insert({
        id: feedbackId,
        boardId: board.id,
        title: title.trim(),
        description: description,
        status: board.settings?.defaultStatus ?? "open",
        authorId: session.user.id,
        voteCount: 0,
        commentCount: 0,
        isApproved: !requiresApproval,
        isPinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Navigate to the new feedback
      navigate({
        to: "/$orgSlug/$boardSlug/$feedbackId",
        params: { orgSlug, boardSlug, feedbackId },
      });
    } catch {
      setError("Failed to submit feedback. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <p className="text-muted-foreground mb-4">
          You must be logged in to submit feedback.
        </p>
        <Button
          onClick={() => navigate({ to: "/login" })}
        >
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Button
        variant="ghost"
        onClick={() =>
          navigate({
            to: "/$orgSlug/$boardSlug",
            params: { orgSlug, boardSlug },
          })
        }
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {board?.name ?? "Board"}
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Submit Feedback</h1>
        <p className="text-muted-foreground mt-1">
          Share your ideas, suggestions, or report issues
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Brief summary of your feedback"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">
            {title.length}/200 characters
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <TiptapEditor
            content={description}
            onChange={setDescription}
            placeholder="Provide more details about your feedback..."
            editable={!isSubmitting}
            minHeight="200px"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate({
                to: "/$orgSlug/$boardSlug",
                params: { orgSlug, boardSlug },
              })
            }
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </Button>
        </div>
      </form>
    </div>
  );
}
