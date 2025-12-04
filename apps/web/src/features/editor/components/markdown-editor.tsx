"use client";

import { serializeMd } from "@platejs/markdown";
import {
  BoldIcon,
  Code2Icon,
  ItalicIcon,
  StrikethroughIcon,
} from "lucide-react";
import { KEYS } from "platejs";
import { Plate, PlateContent } from "platejs/react";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { FloatingToolbar } from "@/components/ui/floating-toolbar";
import {
  RedoToolbarButton,
  UndoToolbarButton,
} from "@/components/ui/history-toolbar-button";
import { LinkToolbarButton } from "@/components/ui/link-toolbar-button";
import { MarkToolbarButton } from "@/components/ui/mark-toolbar-button";
import { ToolbarGroup } from "@/components/ui/toolbar";
import { useMarkdownEditor } from "@/features/editor/hooks/use-markdown-editor";
import { cn } from "@/lib/utils";
import "@/features/editor/components/editor.css";

type MarkdownEditorProps = {
  value?: string;
  onChange?: (markdown: string) => void;
  placeholder?: string;
  className?: string;
  editorClassName?: string;
  autoFocus?: boolean;
  editable?: boolean;
  showToolbar?: boolean;
  enableDnd?: boolean;
};

export function MarkdownEditor({
  value = "",
  onChange,
  placeholder = "Start typing or press '/' for commands...",
  className,
  editorClassName,
  autoFocus = false,
  editable = true,
  showToolbar = true,
  enableDnd = false,
}: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  // Track mounted state to prevent updates after unmount
  useSyncExternalStore(
    () => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
      };
    },
    () => true,
    () => true
  );

  const handleUpdate = useCallback(
    (markdown: string) => {
      // Only call onChange if still mounted
      if (isMountedRef.current) {
        onChange?.(markdown);
      }
    },
    [onChange]
  );

  const { editor } = useMarkdownEditor({
    content: value,
    onUpdate: handleUpdate,
    placeholder,
    autoFocus,
    editable,
    enableDnd,
  });

  if (!editor) {
    return (
      <div
        className={cn("h-64 animate-pulse rounded-lg bg-muted", className)}
      />
    );
  }

  const editorContent = (
    <div className={cn("relative flex flex-col", className)} ref={containerRef}>
      <Plate
        editor={editor}
        onChange={({ editor: ed }) => {
          const markdown = serializeMd(ed);
          handleUpdate(markdown);
        }}
      >
        <div className="relative **:selection:bg-blue-500/35! dark:**:selection:bg-blue-400/45!">
          <PlateContent
            className={cn(
              "prose prose-sm dark:prose-invert max-w-none",
              "min-h-[200px] w-full rounded-lg border border-input bg-background px-4 py-3",
              "*:mx-auto *:max-w-3xl focus:outline-none",
              "",
              editorClassName
            )}
            placeholder={placeholder}
          />

          {/* Floating toolbar appears when text is selected */}
          {showToolbar && editable && (
            <FloatingToolbar>
              <ToolbarGroup>
                <UndoToolbarButton />
                <RedoToolbarButton />
              </ToolbarGroup>
              <ToolbarGroup>
                <MarkToolbarButton nodeType={KEYS.bold} tooltip="Bold (⌘B)">
                  <BoldIcon />
                </MarkToolbarButton>
                <MarkToolbarButton nodeType={KEYS.italic} tooltip="Italic (⌘I)">
                  <ItalicIcon />
                </MarkToolbarButton>
                <MarkToolbarButton
                  nodeType={KEYS.strikethrough}
                  tooltip="Strikethrough"
                >
                  <StrikethroughIcon />
                </MarkToolbarButton>
                <MarkToolbarButton nodeType={KEYS.code} tooltip="Code (⌘E)">
                  <Code2Icon />
                </MarkToolbarButton>
              </ToolbarGroup>
              <ToolbarGroup>
                <LinkToolbarButton />
              </ToolbarGroup>
            </FloatingToolbar>
          )}
        </div>
      </Plate>
    </div>
  );

  // Wrap with DndProvider when drag and drop is enabled
  if (enableDnd) {
    return <DndProvider backend={HTML5Backend}>{editorContent}</DndProvider>;
  }

  return editorContent;
}
