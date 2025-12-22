import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { useQuery, useZero } from "@rocicorp/zero/react";
import {
  createFileRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { useAuthDialog } from "@/components/auth-dialog-provider";
import { MarkdownEditor } from "@/features/editor/components/markdown-editor";
import { authClient } from "@/lib/auth-client";
import { mutators } from "@/mutators";
import { queries } from "@/queries";
import { randID } from "@/rand";

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
  const zero = useZero();
  const { data: session } = authClient.useSession();
  const { openAuthDialog } = useAuthDialog();
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Get organization and board
  const [orgs] = useQuery(queries.organization.bySlug({ slug: orgSlug }));
  const org = orgs?.[0];

  const [boards] = useQuery(
    queries.board.byOrgAndSlug({
      organizationId: org?.id ?? "",
      slug: boardSlug,
    })
  );
  const board = boards?.[0];

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-resize title textarea
  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.slice(0, 200);
    setTitle(value);
    // Auto-resize
    if (titleRef.current) {
      titleRef.current.style.height = "auto";
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
    }
  };

  // Handle title keydown - Enter moves to description
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Focus on the description editor would require a ref - for now just blur
      titleRef.current?.blur();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please enter a title");
      titleRef.current?.focus();
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

      await zero.mutate(
        mutators.feedback.insert({
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
        })
      );

      console.log("[NewFeedback] Mutation completed, verifying creation...");

      // Verify the feedback was actually created before navigating
      let verified = false;
      for (let i = 0; i < MAX_VERIFY_ATTEMPTS; i++) {
        const [result] = await zero.run(
          queries.feedback.byId({ id: feedbackId })
        );

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
    <>
      {/* Back link */}
      <div className="wrapper-content flex">
        <Button
          className="mb-6 gap-2"
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
      </div>

      {/* Notion-style form */}
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="wrapper-content mb-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Notion-style title input */}
        <div className="wrapper-content mb-2">
          <textarea
            className={cn(
              "w-full resize-none overflow-hidden bg-transparent",
              "font-bold text-4xl leading-tight",
              "placeholder:text-muted-foreground/50",
              "border-none outline-none focus:outline-none focus:ring-0",
              "min-h-[1.2em]"
            )}
            disabled={isSubmitting}
            maxLength={200}
            onChange={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled"
            ref={titleRef}
            rows={1}
            value={title}
          />
          <p className="mt-1 text-muted-foreground text-xs">
            {title.length}/200 characters
          </p>
        </div>

        {/* Notion-style description editor */}

        {isSubmitting ? (
          <div className="wrapper-content min-h-[200px] rounded-lg bg-muted/30 p-4">
            <p className="text-muted-foreground text-sm">
              {description || "No description provided"}
            </p>
          </div>
        ) : (
          <MarkdownEditor
            editable
            editorClassName="border-none shadow-none px-0 py-0 bg-transparent"
            enableDnd
            onChange={setDescription}
            value={description}
          />
        )}

        {/* Submit buttons - sticky at bottom */}
        <div className="wrapper-content sticky bottom-0 flex justify-end gap-3 border-t bg-background py-4">
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
          <Button disabled={isSubmitting || !title.trim()} type="submit">
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
    </>
  );
}
