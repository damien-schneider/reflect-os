import { useQuery, useZero } from "@rocicorp/zero/react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { Globe, Layers, Lock, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Switch } from "../../../components/ui/switch";
import { Textarea } from "../../../components/ui/textarea";
import { randID } from "../../../rand";
import type { Board, Schema } from "../../../schema";

export const Route = createFileRoute("/$orgSlug/admin/boards")({
  component: AdminBoards,
});

function AdminBoards() {
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
    if (!(name.trim() && slug.trim() && org)) return;

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
          <h1 className="font-bold text-2xl">Manage Boards</h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage feedback boards
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Board
        </Button>
      </div>

      {/* All Boards */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 font-semibold text-lg">
          <Layers className="h-5 w-5" />
          Boards ({(boards ?? []).length})
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {(boards ?? []).map((board) => (
            <BoardCard
              board={board}
              key={board.id}
              onDelete={() => handleDelete(board)}
              onEdit={() => openEditModal(board)}
            />
          ))}
          {(boards ?? []).length === 0 && (
            <p className="col-span-2 py-8 text-center text-muted-foreground">
              No boards yet
            </p>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Dialog
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) resetForm();
        }}
        open={showCreateModal}
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
            <Button
              onClick={() => {
                setShowCreateModal(false);
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
  onEdit,
  onDelete,
}: {
  board: Board;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">{board.name}</h3>
          </div>
          <p className="mt-1 text-muted-foreground text-sm">/{board.slug}</p>
        </div>
        <Badge variant={board.isPublic ? "secondary" : "outline"}>
          {board.isPublic ? (
            <>
              <Globe className="mr-1 h-3 w-3" />
              Public
            </>
          ) : (
            <>
              <Lock className="mr-1 h-3 w-3" />
              Private
            </>
          )}
        </Badge>
      </div>

      {board.description && (
        <p className="line-clamp-2 text-muted-foreground text-sm">
          {board.description}
        </p>
      )}

      <div className="flex gap-2">
        <Button onClick={onEdit} size="sm" variant="outline">
          <Pencil className="mr-1 h-3 w-3" />
          Edit
        </Button>
        <Button
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
          size="sm"
          variant="outline"
        >
          <Trash2 className="mr-1 h-3 w-3" />
          Delete
        </Button>
      </div>
    </div>
  );
}
