"use client";

import { serializeMd } from "@platejs/markdown";
import {
  BoldIcon,
  Code2Icon,
  ItalicIcon,
  StrikethroughIcon,
} from "lucide-react";
import { KEYS } from "platejs";
import { Plate } from "platejs/react";
import { useRef, useSyncExternalStore } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Editor, EditorContainer } from "@/components/ui/editor";
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

type MarkdownEditorProps = {
  value?: string;
  onChange?: (markdown: string) => void;
  className?: string;
  editorClassName?: string;
  autoFocus?: boolean;
  editable?: boolean;
  showToolbar?: boolean;
  enableDnd?: boolean;
};

const EDITOR_PLACEHOLDER = "Start typing or press '/' for commands...";

export function MarkdownEditor({
  value = "",
  onChange,
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

  const handleUpdate = (markdown: string) => {
    // Only call onChange if still mounted
    if (isMountedRef.current) {
      onChange?.(markdown);
    }
  };

  const { editor } = useMarkdownEditor({
    content: value,
    onUpdate: handleUpdate,
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
        <EditorContainer>
          <Editor
            className={cn(
              "w-full",
              "min-h-150! *:mx-auto *:max-w-3xl focus:outline-none",
              editorClassName
            )}
            placeholder={EDITOR_PLACEHOLDER}
            variant="default"
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
        </EditorContainer>
      </Plate>
    </div>
  );

  // Wrap with DndProvider when drag and drop is enabled
  if (enableDnd) {
    return <DndProvider backend={HTML5Backend}>{editorContent}</DndProvider>;
  }

  return editorContent;
}
