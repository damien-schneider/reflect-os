import { useState, useEffect } from "react";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { ChangelogItemSelector } from "./changelog-item-selector";
import { randID } from "../../rand";
import type { Schema, Release, ReleaseItem } from "../../schema";

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
  const z = useZero<Schema>();
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
    z.query.releaseItem.where("releaseId", "=", release?.id ?? "")
  );

  // Safely convert to array - only use items if actually editing
  const releaseItems: ReleaseItem[] = isEditing && Array.isArray(releaseItemsData) ? releaseItemsData : [];

  // Initialize selected items from existing release items
  useEffect(() => {
    if (releaseItems.length > 0 && selectedFeedbackIds.length === 0) {
      setSelectedFeedbackIds(releaseItems.map((ri) => ri.feedbackId));
    }
  }, [releaseItems, selectedFeedbackIds.length]);

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setIsSubmitting(true);

    try {
      const now = Date.now();
      const releaseId = release?.id ?? randID();
      
      if (isEditing) {
        // Update existing release
        z.mutate.release.update({
          id: releaseId,
          title: title.trim(),
          description: description.trim() || null,
          version: version.trim() || null,
          publishedAt: isPublished ? (release?.publishedAt ?? now) : null,
          updatedAt: now,
        });
      } else {
        // Create new release
        z.mutate.release.insert({
          id: releaseId,
          organizationId,
          title: title.trim(),
          description: description.trim() || null,
          version: version.trim() || null,
          publishedAt: isPublished ? now : null,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Update release items
      // First, delete removed items
      for (const item of releaseItems) {
        if (!selectedFeedbackIds.includes(item.feedbackId)) {
          z.mutate.releaseItem.delete({ id: item.id });
        }
      }

      // Then, add new items
      const existingFeedbackIds = releaseItems.map((ri) => ri.feedbackId);
      for (const feedbackId of selectedFeedbackIds) {
        if (!existingFeedbackIds.includes(feedbackId)) {
          z.mutate.releaseItem.insert({
            id: randID(),
            releaseId,
            feedbackId,
            createdAt: now,
          });
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
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., January 2025 Release"
        />
      </div>

      {/* Version */}
      <div className="space-y-2">
        <Label htmlFor="version">Version (optional)</Label>
        <Input
          id="version"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="e.g., v1.2.0"
          className="font-mono"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A brief summary of this release..."
          rows={3}
        />
      </div>

      {/* Publish Toggle */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="space-y-0.5">
          <Label htmlFor="isPublished" className="text-sm font-normal">
            Publish Release
          </Label>
          <p className="text-xs text-muted-foreground">
            Published releases are visible to everyone
          </p>
        </div>
        <Switch
          id="isPublished"
          checked={isPublished}
          onCheckedChange={setIsPublished}
        />
      </div>

      {/* Completed Items Selector */}
      <div className="border-t pt-4">
        <Label className="text-base font-semibold mb-4 block">
          Completed Items
        </Label>
        <ChangelogItemSelector
          organizationId={organizationId}
          selectedIds={selectedFeedbackIds}
          onSelectionChange={setSelectedFeedbackIds}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 border-t pt-4">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !title.trim()}
        >
          {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Release"}
        </Button>
      </div>
    </div>
  );
}
