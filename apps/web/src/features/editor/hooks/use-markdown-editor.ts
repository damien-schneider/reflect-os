"use client";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Link from "@tiptap/extension-link";
import NodeRange from "@tiptap/extension-node-range";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Typography from "@tiptap/extension-typography";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { createLowlight } from "lowlight";

type UseMarkdownEditorOptions = {
  content?: string;
  onUpdate?: (markdown: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  editable?: boolean;
  lowlight: ReturnType<typeof createLowlight>;
};

export function useMarkdownEditor({
  content = "",
  onUpdate,
  placeholder = "Start typing...",
  autoFocus = false,
  editable = true,
  lowlight,
}: UseMarkdownEditorOptions) {
  const editor = useEditor({
    immediatelyRender: false, // Prevent SSR hydration mismatch
    extensions: [
      Markdown,

      StarterKit.configure({
        codeBlock: false, // We use lowlight version instead
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class:
            "text-primary underline underline-offset-4 hover:text-primary/80",
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: "not-prose pl-0 list-none",
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: "flex items-start gap-2 my-1",
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: "rounded-lg bg-muted p-4 font-mono text-sm overflow-x-auto",
        },
      }),
      Typography,
      NodeRange,
    ],
    content,
    autofocus: autoFocus ? "end" : false,
    editable,
    editorProps: {
      attributes: {
        class: "focus:outline-none",
      },
    },
    onUpdate: ({ editor: e }) => {
      const markdown = e.getMarkdown();
      onUpdate?.(markdown);
    },
  });

  return { editor };
}
