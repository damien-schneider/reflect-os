"use client";

import { cn } from "@repo/ui/lib/utils";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import { EditorContent } from "@tiptap/react";
import {
  BoldIcon,
  Code2Icon,
  GripVerticalIcon,
  ItalicIcon,
  Link2Icon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  Redo2Icon,
  StrikethroughIcon,
  Undo2Icon,
} from "lucide-react";
import { useMarkdownEditor } from "@/features/editor/hooks/use-markdown-editor";

type MarkdownEditorProps = {
  value?: string;
  onChange?: (markdown: string) => void;
  className?: string;
  editorClassName?: string;
  autoFocus?: boolean;
  editable?: boolean;
  showToolbar?: boolean;
  placeholder?: string;
};

export function MarkdownEditor({
  value = "",
  onChange,
  className,
  editorClassName,
  autoFocus = false,
  editable = true,
  showToolbar = true,
  placeholder,
}: MarkdownEditorProps) {
  const { editor } = useMarkdownEditor({
    content: value,
    onUpdate: onChange,
    autoFocus,
    editable,
    placeholder,
  });

  if (!editor) {
    return (
      <div
        className={cn("h-64 animate-pulse rounded-lg bg-muted", className)}
      />
    );
  }

  return (
    <div className={cn("relative flex flex-col", className)}>
      {/* Toolbar */}
      {showToolbar && editable && (
        <div className="flex flex-wrap items-center gap-1 border-b p-2">
          <ToolbarButton
            isActive={false}
            onClick={() => editor.chain().focus().undo().run()}
            title="Undo"
          >
            <Undo2Icon className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            isActive={false}
            onClick={() => editor.chain().focus().redo().run()}
            title="Redo"
          >
            <Redo2Icon className="size-4" />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            isActive={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (⌘B)"
          >
            <BoldIcon className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            isActive={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (⌘I)"
          >
            <ItalicIcon className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            isActive={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <StrikethroughIcon className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            isActive={editor.isActive("code")}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Code (⌘E)"
          >
            <Code2Icon className="size-4" />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            isActive={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            <ListIcon className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            isActive={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
          >
            <ListOrderedIcon className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            isActive={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Quote"
          >
            <QuoteIcon className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            isActive={editor.isActive("link")}
            onClick={() => {
              if (editor.isActive("link")) {
                editor.chain().focus().unsetLink().run();
              } else {
                // biome-ignore lint/suspicious/noAlert: Simple prompt for URL input in editor toolbar
                const url = window.prompt("Enter URL");
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run();
                }
              }
            }}
            title="Link"
          >
            <Link2Icon className="size-4" />
          </ToolbarButton>
        </div>
      )}

      {/* Editor content with Drag Handle */}
      <div className="relative">
        <DragHandle editor={editor}>
          <div className="flex cursor-grab items-center justify-center rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:cursor-grabbing">
            <GripVerticalIcon className="size-4" />
          </div>
        </DragHandle>
        <EditorContent
          className={cn(
            "editor-content",
            "focus-within:outline-none",
            editorClassName
          )}
          editor={editor}
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  isActive,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  isActive: boolean;
  title: string;
}) {
  return (
    <button
      className={cn(
        "rounded p-1.5 transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-6 w-px bg-border" />;
}
