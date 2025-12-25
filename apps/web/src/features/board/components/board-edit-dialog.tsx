import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Switch } from "@repo/ui/components/switch";
import { Textarea } from "@repo/ui/components/textarea";
import { useZero } from "@rocicorp/zero/react";
import { useEffect, useState } from "react";
import { mutators } from "@/mutators";
import { randID } from "@/rand";
import type { Board } from "@/schema";

interface BoardEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board?: Board | null;
  organizationId: string;
  orgSlug: string;
  onSuccess?: () => void;
}

export function BoardEditDialog({
  open,
  onOpenChange,
  board,
  organizationId,
  orgSlug,
  onSuccess,
}: BoardEditDialogProps) {
  const zero = useZero();

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!board;

  // Reset form when dialog opens/closes or board changes
  useEffect(() => {
    if (open) {
      if (board) {
        setName(board.name);
        setSlug(board.slug);
        setDescription(board.description ?? "");
        setIsPublic(board.isPublic ?? true);
      } else {
        setName("");
        setSlug("");
        setDescription("");
        setIsPublic(true);
      }
    }
  }, [open, board]);

  const handleSubmit = async () => {
    if (!(name.trim() && slug.trim() && organizationId)) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && board) {
        // Update existing board
        await zero.mutate(
          mutators.board.update({
            id: board.id,
            name: name.trim(),
            slug: slug.trim().toLowerCase(),
            description: description.trim() || undefined,
            isPublic,
            updatedAt: Date.now(),
          })
        );
      } else {
        // Create new board
        await zero.mutate(
          mutators.board.insert({
            id: randID(),
            organizationId,
            name: name.trim(),
            slug: slug.trim().toLowerCase(),
            description: description.trim() || undefined,
            isPublic,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
        );
      }

      onOpenChange(false);
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-generate slug from name (only for new boards)
  const handleNameChange = (value: string) => {
    setName(value);
    if (!isEditing) {
      setSlug(
        value
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
      );
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Board" : "Create New Board"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your board settings"
              : "Create a new board for feedback collection"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Product Feedback"
              value={name}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug</Label>
            <Input
              id="slug"
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g., product-feedback"
              value={slug}
            />
            <p className="text-muted-foreground text-xs">
              /{orgSlug}/{slug || "slug"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this board for?"
              rows={3}
              value={description}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="public">Public Board</Label>
              <p className="text-muted-foreground text-xs">
                {isPublic
                  ? "Anyone can view this board"
                  : "Only organization members can view"}
              </p>
            </div>
            <Switch
              checked={isPublic}
              id="public"
              onCheckedChange={setIsPublic}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={isSubmitting || !name.trim() || !slug.trim()}
            onClick={handleSubmit}
          >
            {(() => {
              if (isSubmitting) {
                return "Saving...";
              }
              if (isEditing) {
                return "Save Changes";
              }
              return "Create Board";
            })()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
