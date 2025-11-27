import { useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useZero } from "@rocicorp/zero/react";
import {
  Plus,
  Pencil,
  Trash2,
  Globe,
  Lock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { randID } from "@/rand";
import type { Schema, Board } from "@/schema";

export const Route = createFileRoute("/dashboard/$orgSlug/boards")({
  component: DashboardBoards,
});

function DashboardBoards() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string };
  const z = useZero<Schema>();

  // Get organization
  const [orgs] = useQuery(z.query.organization.where("slug", "=", orgSlug));
  const org = orgs?.[0];

  // Get boards
  const [boards] = useQuery(
    z.query.board
      .where("organizationId", "=", org?.id ?? "")
      .orderBy("createdAt", "desc")
  );

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setSlug("");
    setDescription("");
    setIsPublic(true);
    setEditingBoard(null);
  };

  const openEditModal = (board: Board) => {
    setEditingBoard(board);
    setName(board.name);
    setSlug(board.slug);
    setDescription(board.description ?? "");
    setIsPublic(board.isPublic ?? true);
    setShowCreateModal(true);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim() || !org) return;

    setIsSubmitting(true);

    try {
      if (editingBoard) {
        // Update existing board
        await z.mutate.board.update({
          id: editingBoard.id,
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          description: description.trim() || undefined,
          isPublic,
          updatedAt: Date.now(),
        });
      } else {
        // Create new board
        await z.mutate.board.insert({
          id: randID(),
          organizationId: org.id,
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          description: description.trim() || undefined,
          isPublic,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      setShowCreateModal(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (board: Board) => {
    if (!confirm(`Delete "${board.name}"? This cannot be undone.`)) return;
    await z.mutate.board.delete({ id: board.id });
  };

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!editingBoard) {
      setSlug(
        value
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
      );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Boards</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage feedback boards
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Board
        </Button>
      </div>

      {/* All Boards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Boards ({(boards ?? []).length})
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {(boards ?? []).map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              orgSlug={orgSlug}
              onEdit={() => openEditModal(board)}
              onDelete={() => handleDelete(board)}
            />
          ))}
          {(boards ?? []).length === 0 && (
            <p className="text-muted-foreground col-span-2 py-8 text-center">
              No boards yet
            </p>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Dialog
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBoard ? "Edit Board" : "Create New Board"}
            </DialogTitle>
            <DialogDescription>
              {editingBoard
                ? "Update your board settings"
                : "Create a new board for feedback collection"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Product Feedback"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g., product-feedback"
              />
              <p className="text-xs text-muted-foreground">
                /{orgSlug}/{slug || "slug"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this board for?"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="public">Public Board</Label>
                <p className="text-xs text-muted-foreground">
                  {isPublic
                    ? "Anyone can view this board"
                    : "Only organization members can view"}
                </p>
              </div>
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
              {isSubmitting
                ? "Saving..."
                : editingBoard
                ? "Save Changes"
                : "Create Board"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BoardCard({
  board,
  orgSlug,
  onEdit,
  onDelete,
}: {
  board: Board;
  orgSlug: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">{board.name}</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1">/{orgSlug}/{board.slug}</p>
        </div>
        <Badge variant={board.isPublic ? "secondary" : "outline"}>
          {board.isPublic ? (
            <>
              <Globe className="h-3 w-3 mr-1" />
              Public
            </>
          ) : (
            <>
              <Lock className="h-3 w-3 mr-1" />
              Private
            </>
          )}
        </Badge>
      </div>

      {board.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {board.description}
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="h-3 w-3 mr-1" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );
}
