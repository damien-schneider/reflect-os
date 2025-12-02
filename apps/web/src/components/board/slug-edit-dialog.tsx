import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SlugEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSlug: string;
  orgSlug: string;
  onSave: (newSlug: string) => void;
};

export function SlugEditDialog({
  open,
  onOpenChange,
  currentSlug,
  orgSlug,
  onSave,
}: SlugEditDialogProps) {
  const [slug, setSlug] = useState(currentSlug);
  const [isValid, setIsValid] = useState(true);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset state when opening
      setSlug(currentSlug);
      setIsValid(true);
    }
    onOpenChange(newOpen);
  };

  const handleSlugChange = (value: string) => {
    const sanitized = value
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    setSlug(sanitized);
    setIsValid(sanitized.length > 0);
  };

  const handleSave = () => {
    if (slug.trim() && slug !== currentSlug) {
      onSave(slug.trim());
    }
    onOpenChange(false);
  };

  return (
    <AlertDialog onOpenChange={handleOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Change Board URL
          </AlertDialogTitle>
          <AlertDialogDescription>
            Changing the URL slug will break any existing links or bookmarks to
            this board. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug</Label>
            <Input
              id="slug"
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="board-slug"
              value={slug}
            />
            <p className="text-muted-foreground text-xs">
              New URL: /{orgSlug}/{slug || "slug"}
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-amber-600 hover:bg-amber-700"
            disabled={!isValid || slug === currentSlug}
            onClick={handleSave}
          >
            Change URL
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
