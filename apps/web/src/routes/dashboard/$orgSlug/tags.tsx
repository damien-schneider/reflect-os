import { useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { Plus, Pencil, Trash2, CheckCircle, Map, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { randID } from "@/rand";
import type { Schema, Tag } from "@/schema";

export const Route = createFileRoute("/dashboard/$orgSlug/tags")({
  component: DashboardTags,
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

function DashboardTags() {
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
  const [isDoneStatus, setIsDoneStatus] = useState(false);
  const [isRoadmapLane, setIsRoadmapLane] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setColor(COLOR_PALETTE[0]);
    setIsDoneStatus(false);
    setIsRoadmapLane(false);
    setEditingTag(null);
  };

  const openEditModal = (tag: Tag) => {
    setEditingTag(tag);
    setName(tag.name);
    setColor(tag.color);
    setIsDoneStatus(tag.isDoneStatus ?? false);
    setIsRoadmapLane(tag.isRoadmapLane ?? false);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !org) return;

    setIsSubmitting(true);

    try {
      // Get existing roadmap lane tags for order calculation
      const existingLaneTags = (tags ?? []).filter((t) => t.isRoadmapLane);
      const maxOrder = existingLaneTags.reduce(
        (max, t) => Math.max(max, t.laneOrder ?? 0),
        0
      );

      if (editingTag) {
        await z.mutate.tag.update({
          id: editingTag.id,
          name: name.trim(),
          color,
          isDoneStatus,
          isRoadmapLane,
          // Set lane order if becoming a roadmap lane
          laneOrder: isRoadmapLane && !editingTag.isRoadmapLane 
            ? maxOrder + 1000 
            : isRoadmapLane 
              ? editingTag.laneOrder 
              : null,
        });
      } else {
        await z.mutate.tag.insert({
          id: randID(),
          organizationId: org.id,
          name: name.trim(),
          color,
          isDoneStatus,
          isRoadmapLane,
          laneOrder: isRoadmapLane ? maxOrder + 1000 : null,
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
    if (!confirm(`Delete "${tag.name}"? This will remove it from all feedback.`)) return;
    await z.mutate.tag.delete({ id: tag.id });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Tags</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage tags to categorize feedback
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Tag
        </Button>
      </div>

      {/* Tags Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tags?.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div
                className="h-4 w-4 rounded-full shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              <div className="min-w-0">
                <span className="font-medium">{tag.name}</span>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {tag.isRoadmapLane && (
                    <Badge variant="outline" className="text-xs py-0">
                      <Map className="h-3 w-3 mr-1" />
                      Lane
                    </Badge>
                  )}
                  {tag.isDoneStatus && (
                    <Badge variant="outline" className="text-xs py-0 text-green-600 border-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Done
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openEditModal(tag)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(tag)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {(!tags || tags.length === 0) && (
          <p className="text-muted-foreground col-span-full text-center py-8">
            No tags yet. Create your first tag to categorize feedback.
          </p>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTag ? "Edit Tag" : "Create New Tag"}</DialogTitle>
            <DialogDescription>
              Tags help organize and filter feedback
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Bug, Feature Request, UI/UX"
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-full transition-all ${
                      color === c ? "ring-2 ring-offset-2 ring-primary" : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Preview</Label>
              <Badge
                variant="secondary"
                style={{ backgroundColor: `${color}20`, color }}
              >
                {name || "Tag name"}
              </Badge>
            </div>

            <div className="border-t pt-4 mt-4 space-y-4">
              <Label className="text-base font-semibold">Roadmap Settings</Label>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isRoadmapLane" className="text-sm font-normal">
                    Use as Roadmap Lane
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    This tag will appear as a lane in the roadmap kanban view
                  </p>
                </div>
                <Switch
                  id="isRoadmapLane"
                  checked={isRoadmapLane}
                  onCheckedChange={setIsRoadmapLane}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isDoneStatus" className="text-sm font-normal">
                    Mark as "Done" Status
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Items moved to this lane will be marked as completed for the changelog
                  </p>
                </div>
                <Switch
                  id="isDoneStatus"
                  checked={isDoneStatus}
                  onCheckedChange={setIsDoneStatus}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? "Saving..." : editingTag ? "Save Changes" : "Create Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
