import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Switch } from "@repo/ui/components/switch";
import { Textarea } from "@repo/ui/components/textarea";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { useEffect, useState } from "react";
import { ChangelogItemSelector } from "@/features/changelog/components/changelog-item-selector";
import { mutators } from "@/mutators";
import { queries } from "@/queries";
import { randID } from "@/rand";
import type { Release, ReleaseItem } from "@/schema";

interface ReleaseEditorProps {
  organizationId: string;
  release?: Release | null;
  onClose?: () => void;
  onSave?: () => void;
}

export function ReleaseEditor({
  organizationId,
  release,
  onClose,
  onSave,
}: ReleaseEditorProps) {
  const zero = useZero();
  const isEditing = !!release;

  // Form state
  const [title, setTitle] = useState(release?.title ?? "");
  const [description, setDescription] = useState(release?.description ?? "");
  const [version, setVersion] = useState(release?.version ?? "");
  const [isPublished, setIsPublished] = useState(!!release?.publishedAt);
  const [selectedFeedbackIds, setSelectedFeedbackIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current release items if editing
  const [releaseItemsData] = useQuery(
    queries.releaseItem.byReleaseId({ releaseId: release?.id ?? "" })
  );

  // Safely convert to array - only use items if actually editing
  const releaseItems: ReleaseItem[] =
    isEditing && Array.isArray(releaseItemsData) ? releaseItemsData : [];

  // Initialize selected items from existing release items
  useEffect(() => {
    if (releaseItems.length > 0 && selectedFeedbackIds.length === 0) {
      setSelectedFeedbackIds(releaseItems.map((ri) => ri.feedbackId));
    }
  }, [releaseItems, selectedFeedbackIds.length]);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complex form submission logic
  const handleSubmit = () => {
    if (!title.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const now = Date.now();
      const releaseId = release?.id ?? randID();

      if (isEditing) {
        // Update existing release
        zero.mutate(
          mutators.release.update({
            id: releaseId,
            title: title.trim(),
            description: description.trim() || undefined,
            version: version.trim() || undefined,
            publishedAt: isPublished ? (release?.publishedAt ?? now) : null,
            updatedAt: now,
          })
        );
      } else {
        // Create new release
        zero.mutate(
          mutators.release.insert({
            id: releaseId,
            organizationId,
            title: title.trim(),
            description: description.trim() || undefined,
            version: version.trim() || undefined,
            publishedAt: isPublished ? now : null,
            createdAt: now,
            updatedAt: now,
          })
        );
      }

      // Update release items
      // First, delete removed items
      for (const item of releaseItems) {
        if (!selectedFeedbackIds.includes(item.feedbackId)) {
          zero.mutate(mutators.releaseItem.delete({ id: item.id }));
        }
      }

      // Then, add new items
      const existingFeedbackIds = releaseItems.map((ri) => ri.feedbackId);
      for (const feedbackId of selectedFeedbackIds) {
        if (!existingFeedbackIds.includes(feedbackId)) {
          zero.mutate(
            mutators.releaseItem.insert({
              id: randID(),
              releaseId,
              feedbackId,
              createdAt: now,
            })
          );
        }
      }

      onSave?.();
      onClose?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., January 2025 Release"
          value={title}
        />
      </div>

      {/* Version */}
      <div className="space-y-2">
        <Label htmlFor="version">Version (optional)</Label>
        <Input
          className="font-mono"
          id="version"
          onChange={(e) => setVersion(e.target.value)}
          placeholder="e.g., v1.2.0"
          value={version}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A brief summary of this release..."
          rows={3}
          value={description}
        />
      </div>

      {/* Publish Toggle */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="space-y-0.5">
          <Label className="font-normal text-sm" htmlFor="isPublished">
            Publish Release
          </Label>
          <p className="text-muted-foreground text-xs">
            Published releases are visible to everyone
          </p>
        </div>
        <Switch
          checked={isPublished}
          id="isPublished"
          onCheckedChange={setIsPublished}
        />
      </div>

      {/* Completed Items Selector */}
      <div className="border-t pt-4">
        <Label className="mb-4 block font-semibold text-base">
          Completed Items
        </Label>
        <ChangelogItemSelector
          onSelectionChange={setSelectedFeedbackIds}
          organizationId={organizationId}
          selectedIds={selectedFeedbackIds}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 border-t pt-4">
        {onClose && (
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
        )}
        <Button disabled={isSubmitting || !title.trim()} onClick={handleSubmit}>
          {(() => {
            if (isSubmitting) {
              return "Saving...";
            }
            if (isEditing) {
              return "Save Changes";
            }
            return "Create Release";
          })()}
        </Button>
      </div>
    </div>
  );
}
