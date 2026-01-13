"use client";

import { Button } from "@repo/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { cn } from "@repo/ui/lib/utils";
import { useZero } from "@rocicorp/zero/react";
import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { InlineEditor } from "@/features/editor/components/inline-editor";
import { MarkdownEditor } from "@/features/editor/components/markdown-editor";
import { authClient } from "@/lib/auth-client";
import type { FeedbackStatus } from "@/lib/constants";
import { STATUS_OPTIONS } from "@/lib/constants";
import { mutators } from "@/mutators";
import { randID } from "@/rand";

const MAX_TITLE_LENGTH = 200;

interface InlineFeedbackCreatorProps {
  boardId: string;
  orgSlug: string;
  boardSlug: string;
  defaultStatus?: FeedbackStatus;
  onSuccess?: (feedbackId: string) => void;
  className?: string;
}

/**
 * Inline feedback creator component that looks like a feedback item card.
 * Features:
 * - Editable title with minimal styling using InlineEditor
 * - Status dropdown
 * - Collapsible "Add details" section with Tiptap markdown editor
 * - Quick submission with just title
 */
export function InlineFeedbackCreator({
  boardId,
  orgSlug: _orgSlug,
  boardSlug: _boardSlug,
  defaultStatus = "open",
  onSuccess,
  className,
}: InlineFeedbackCreatorProps) {
  const zero = useZero();
  const { data: session } = authClient.useSession();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<FeedbackStatus>(defaultStatus);
  const [showDetails, setShowDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle title change with length limit
  const handleTitleChange = useCallback((value: string) => {
    setTitle(value.slice(0, MAX_TITLE_LENGTH));
  }, []);

  const handleSubmit = useCallback(
    async (titleOverride?: string) => {
      const titleToUse = titleOverride ?? title;
      if (!titleToUse.trim()) {
        setError("Please enter a title");
        return;
      }

      if (!session?.user?.id) {
        setError("You must be logged in to create feedback");
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const feedbackId = randID();

        await zero.mutate(
          mutators.feedback.insert({
            id: feedbackId,
            boardId,
            title: titleToUse.trim(),
            description,
            status,
            authorId: session.user.id,
            voteCount: 0,
            commentCount: 0,
            isApproved: true,
            isPinned: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
        );

        // Reset form
        setTitle("");
        setDescription("");
        setShowDetails(false);
        setStatus(defaultStatus);

        onSuccess?.(feedbackId);
      } catch (err) {
        console.error("Error creating feedback:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to create feedback. Please try again."
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      title,
      description,
      status,
      boardId,
      defaultStatus,
      onSuccess,
      zero,
      session,
    ]
  );

  // Handle Enter key in title - submits if details are not shown
  const handleTitleSubmit = useCallback(
    (text: string) => {
      if (!showDetails) {
        handleSubmit(text);
      }
    },
    [showDetails, handleSubmit]
  );

  const handleCancel = useCallback(() => {
    setTitle("");
    setDescription("");
    setShowDetails(false);
    setStatus(defaultStatus);
    setError(null);
  }, [defaultStatus]);

  const hasContent = title.trim() || description.trim();

  return (
    <div
      className={cn(
        "flex gap-4 rounded-lg border p-4 transition-colors",
        "border-muted-foreground/30 border-dashed bg-muted/20",
        "focus-within:border-primary/50 focus-within:bg-muted/30",
        className
      )}
    >
      {/* Vote button placeholder - maintains alignment with other cards */}
      <div className="flex shrink-0 flex-col items-center gap-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted-foreground/30 border-dashed text-muted-foreground">
          <span className="font-medium text-lg">+</span>
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Title input with InlineEditor */}
            <InlineEditor
              className="font-semibold text-base"
              disabled={isSubmitting}
              editorClassName="min-h-[1.5em]"
              onChange={handleTitleChange}
              onSubmit={handleTitleSubmit}
              placeholder="Short, descriptive title..."
              value={title}
            />

            {/* Status selector and add details */}
            <div className="mt-2 flex items-center gap-2">
              <Select
                disabled={isSubmitting}
                onValueChange={(v) => setStatus(v as FeedbackStatus)}
                value={status}
              >
                <SelectTrigger className="h-7 px-2 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {showDetails ? null : (
                <Button
                  className="h-7 px-2 text-xs"
                  disabled={isSubmitting || !title.trim()}
                  onClick={() => setShowDetails(true)}
                  size="sm"
                  variant="ghost"
                >
                  Add details
                </Button>
              )}
            </div>

            {/* Collapsible details section */}
            {showDetails && (
              <div className="fade-in slide-in-from-top-2 mt-3 animate-in duration-200">
                <MarkdownEditor
                  editable
                  editorClassName="border-none shadow-none px-0 py-0 bg-transparent min-h-[80px] [&_.ProseMirror]:min-h-[80px]"
                  onChange={setDescription}
                  placeholder="Add any additional details..."
                  showToolbar={false}
                  value={description}
                />
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button
                    disabled={isSubmitting}
                    onClick={() => setShowDetails(false)}
                    size="sm"
                    variant="ghost"
                  >
                    Hide details
                  </Button>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && <p className="mt-2 text-destructive text-xs">{error}</p>}
          </div>

          {/* Submit button */}
          {hasContent && (
            <div className="flex shrink-0 items-start gap-2">
              {isSubmitting ? (
                <Button disabled size="sm" variant="default">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Creating...
                </Button>
              ) : (
                <Button
                  disabled={!title.trim()}
                  onClick={() => handleSubmit()}
                  size="sm"
                  variant="default"
                >
                  Create
                </Button>
              )}
              <Button
                disabled={isSubmitting}
                onClick={handleCancel}
                size="sm"
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
