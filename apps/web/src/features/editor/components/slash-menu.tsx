"use client";

import { cn } from "@repo/ui/lib/utils";
import type { Editor, Range } from "@tiptap/react";
import type { Ref } from "react";
import { useCallback, useEffect, useImperativeHandle, useState } from "react";
import {
  type SlashCommandItem,
  slashCommandItems,
} from "../extensions/slash-command";

export interface SlashMenuRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface SlashMenuProps {
  editor: Editor;
  range: Range;
  query: string;
  command: (item: SlashCommandItem) => void;
  ref?: Ref<SlashMenuRef>;
}

export function SlashMenu({ query, command, ref }: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredItems = slashCommandItems.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );

  const selectItem = useCallback(
    (index: number) => {
      const item = filteredItems[index];
      if (item) {
        command(item);
      }
    },
    [filteredItems, command]
  );

  // Reset selection when query changes (biome false positive - query dependency is intentional)
  // biome-ignore lint/correctness/useExhaustiveDependencies: query dependency is needed to reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) =>
            prev <= 0 ? filteredItems.length - 1 : prev - 1
          );
          return true;
        }

        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) =>
            prev >= filteredItems.length - 1 ? 0 : prev + 1
          );
          return true;
        }

        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }

        return false;
      },
    }),
    [filteredItems.length, selectItem, selectedIndex]
  );

  if (filteredItems.length === 0) {
    return (
      <div className="z-50 overflow-hidden rounded-lg border bg-popover p-2 text-popover-foreground shadow-md">
        <p className="text-muted-foreground text-sm">No results found</p>
      </div>
    );
  }

  return (
    <div className="z-50 max-h-80 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
      {filteredItems.map((item, index) => (
        <button
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
            index === selectedIndex
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50"
          )}
          key={item.title}
          onClick={() => selectItem(index)}
          onMouseEnter={() => setSelectedIndex(index)}
          type="button"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
            {item.icon}
          </span>
          <div className="flex flex-col">
            <span className="font-medium">{item.title}</span>
            <span className="text-muted-foreground text-xs">
              {item.description}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
