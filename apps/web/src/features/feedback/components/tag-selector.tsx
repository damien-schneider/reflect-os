import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { mutators } from "@/mutators";
import { queries } from "@/queries";
import { randID } from "@/rand";
import type { Tag } from "@/schema";

interface TagSelectorProps {
  feedbackId: string;
  organizationId: string;
  selectedTagIds: string[];
  onChange?: (tagIds: string[]) => void;
  editable?: boolean;
  className?: string;
}

export function TagSelector({
  feedbackId,
  organizationId,
  selectedTagIds,
  onChange,
  editable = true,
  className,
}: TagSelectorProps) {
  const zero = useZero();
  const [open, setOpen] = useState(false);

  // Get all tags for the organization
  const [tags] = useQuery(queries.tag.byOrganizationId({ organizationId }));

  // Get selected tags
  const selectedTags = tags?.filter((t) => selectedTagIds.includes(t.id)) ?? [];

  const toggleTag = async (tag: Tag) => {
    const isSelected = selectedTagIds.includes(tag.id);

    if (isSelected) {
      // Remove tag
      const [feedbackTag] = await zero.run(
        queries.feedbackTag.byFeedbackAndTag({ feedbackId, tagId: tag.id })
      );

      if (feedbackTag) {
        await zero.mutate(mutators.feedbackTag.delete({ id: feedbackTag.id }));
      }

      onChange?.(selectedTagIds.filter((id) => id !== tag.id));
    } else {
      // Add tag
      await zero.mutate(
        mutators.feedbackTag.insert({
          id: randID(),
          feedbackId,
          tagId: tag.id,
        })
      );

      onChange?.([...selectedTagIds, tag.id]);
    }
  };

  const removeTag = async (tagId: string) => {
    const [feedbackTag] = await zero.run(
      queries.feedbackTag.byFeedbackAndTag({ feedbackId, tagId })
    );

    if (feedbackTag) {
      await zero.mutate(mutators.feedbackTag.delete({ id: feedbackTag.id }));
    }

    onChange?.(selectedTagIds.filter((id) => id !== tagId));
  };

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {selectedTags.map((tag) => (
        <Badge
          className="gap-1"
          key={tag.id}
          style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
          variant="secondary"
        >
          {tag.name}
          {editable && (
            <button
              className="rounded-full p-0.5 hover:bg-black/10"
              onClick={() => removeTag(tag.id)}
              type="button"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}

      {editable && (
        <Popover onOpenChange={setOpen} open={open}>
          <PopoverTrigger
            render={
              <Button className="h-6 gap-1 px-2" size="sm" variant="ghost" />
            }
          >
            <Plus className="h-3 w-3" />
            <span className="text-xs">Add tag</span>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48 p-2">
            <div className="space-y-1">
              {tags?.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    className={cn(
                      "flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent",
                      isSelected && "bg-accent"
                    )}
                    key={tag.id}
                    onClick={() => toggleTag(tag)}
                    type="button"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span>{tag.name}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
              {(!tags || tags.length === 0) && (
                <p className="py-2 text-center text-muted-foreground text-xs">
                  No tags available
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

// Simple tag display (read-only)
export function TagList({
  tags,
  className,
}: {
  tags: Tag[];
  className?: string;
}) {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {tags.map((tag) => (
        <Badge
          key={tag.id}
          style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
          variant="secondary"
        >
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}
