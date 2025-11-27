import { useState } from "react";
import { useZero, useQuery } from "@rocicorp/zero/react";
import { X, Check, Plus } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { cn } from "../../lib/utils";
import type { Schema, Tag } from "../../schema";
import { randID } from "../../rand";

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
  const z = useZero<Schema>();
  const [open, setOpen] = useState(false);

  // Get all tags for the organization
  const [tags] = useQuery(
    z.query.tag.where("organizationId", "=", organizationId)
  );

  // Get selected tags
  const selectedTags = tags?.filter((t) => selectedTagIds.includes(t.id)) ?? [];

  const toggleTag = async (tag: Tag) => {
    const isSelected = selectedTagIds.includes(tag.id);
    
    if (isSelected) {
      // Remove tag
      const [feedbackTags] = await z.query.feedbackTag
        .where("feedbackId", "=", feedbackId)
        .where("tagId", "=", tag.id)
        .run();
      
      if (feedbackTags) {
        await z.mutate.feedbackTag.delete({ id: feedbackTags.id });
      }
      
      onChange?.(selectedTagIds.filter((id) => id !== tag.id));
    } else {
      // Add tag
      await z.mutate.feedbackTag.insert({
        id: randID(),
        feedbackId,
        tagId: tag.id,
      });
      
      onChange?.([...selectedTagIds, tag.id]);
    }
  };

  const removeTag = async (tagId: string) => {
    const [feedbackTags] = await z.query.feedbackTag
      .where("feedbackId", "=", feedbackId)
      .where("tagId", "=", tagId)
      .run();
    
    if (feedbackTags) {
      await z.mutate.feedbackTag.delete({ id: feedbackTags.id });
    }
    
    onChange?.(selectedTagIds.filter((id) => id !== tagId));
  };

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {selectedTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
          className="gap-1"
        >
          {tag.name}
          {editable && (
            <button
              onClick={() => removeTag(tag.id)}
              className="hover:bg-black/10 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}

      {editable && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 gap-1">
              <Plus className="h-3 w-3" />
              <span className="text-xs">Add tag</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="space-y-1">
              {tags?.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "flex items-center justify-between w-full px-2 py-1.5 rounded text-sm hover:bg-accent",
                      isSelected && "bg-accent"
                    )}
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
                <p className="text-xs text-muted-foreground text-center py-2">
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
          variant="secondary"
          style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
        >
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}
