import { useQuery, useZero } from "@rocicorp/zero/react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { randID } from "../../../rand";
import type { Schema, Tag } from "../../../schema";

export const Route = createFileRoute("/$orgSlug/admin/tags")({
  component: AdminTags,
});

// Predefined color palette
const COLOR_PALETTE = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
];

function AdminTags() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string };
  const z = useZero<Schema>();

  // Get organization
  const [orgs] = useQuery(z.query.organization.where("slug", "=", orgSlug));
  const org = orgs?.[0];

  // Get tags
  const [tags] = useQuery(
    z.query.tag
      .where("organizationId", "=", org?.id ?? "")
      .orderBy("createdAt", "desc")
  );

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setColor(COLOR_PALETTE[0]);
    setEditingTag(null);
  };

  const openEditModal = (tag: Tag) => {
    setEditingTag(tag);
    setName(tag.name);
    setColor(tag.color);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!(name.trim() && org)) return;

    setIsSubmitting(true);

    try {
      if (editingTag) {
        await z.mutate.tag.update({
          id: editingTag.id,
          name: name.trim(),
          color,
        });
      } else {
        await z.mutate.tag.insert({
          id: randID(),
          organizationId: org.id,
          name: name.trim(),
          color,
          isDoneStatus: false,
          isRoadmapLane: false,
          createdAt: Date.now(),
        });
      }

      setShowModal(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (tag: Tag) => {
    if (
      !confirm(`Delete "${tag.name}"? This will remove it from all feedback.`)
    )
      return;
    await z.mutate.tag.delete({ id: tag.id });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">Manage Tags</h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage tags to categorize feedback
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Tag
        </Button>
      </div>

      {/* Tags Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tags?.map((tag) => (
          <div
            className="flex items-center justify-between rounded-lg border p-4"
            key={tag.id}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              <span className="font-medium">{tag.name}</span>
            </div>
            <div className="flex gap-1">
              <Button
                onClick={() => openEditModal(tag)}
                size="icon"
                variant="ghost"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                className="text-destructive hover:text-destructive"
                onClick={() => handleDelete(tag)}
                size="icon"
                variant="ghost"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {(!tags || tags.length === 0) && (
          <p className="col-span-full py-8 text-center text-muted-foreground">
            No tags yet. Create your first tag to categorize feedback.
          </p>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) resetForm();
        }}
        open={showModal}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTag ? "Edit Tag" : "Create New Tag"}
            </DialogTitle>
            <DialogDescription>
              Tags help organize and filter feedback
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Bug, Feature Request, UI/UX"
                value={name}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    className={`h-8 w-8 rounded-full transition-all ${
                      color === c ? "ring-2 ring-primary ring-offset-2" : ""
                    }`}
                    key={c}
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    type="button"
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Preview</Label>
              <Badge
                style={{ backgroundColor: `${color}20`, color }}
                variant="secondary"
              >
                {name || "Tag name"}
              </Badge>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmitting || !name.trim()}
              onClick={handleSubmit}
            >
              {isSubmitting
                ? "Saving..."
                : editingTag
                  ? "Save Changes"
                  : "Create Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
