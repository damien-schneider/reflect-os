"use client";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Link from "@tiptap/extension-link";
import NodeRange from "@tiptap/extension-node-range";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import { Markdown } from "@tiptap/markdown";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import { useCallback, useMemo } from "react";
import { SlashCommand } from "../extensions/slash-command";
import { createSlashCommandSuggestion } from "../extensions/slash-command-suggestion";

const lowlight = createLowlight(common);

interface UseMarkdownEditorOptions {
  content?: string;
  onUpdate?: (markdown: string) => void;
  autoFocus?: boolean;
  editable?: boolean;
  placeholder?: string;
}

export function useMarkdownEditor({
  content = "",
  onUpdate,
  autoFocus = false,
  editable = true,
  placeholder = "Start typing or press '/' for commands...",
}: UseMarkdownEditorOptions) {
  // Create suggestion config once
  const slashCommandSuggestion = useMemo(
    () => createSlashCommandSuggestion(),
    []
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We use CodeBlockLowlight instead
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-4",
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Markdown.configure({
        markedOptions: {
          gfm: true,
          breaks: true,
        },
      }),
      // Drag and drop support (NodeRange is required for DragHandle React component)
      NodeRange,
      // Slash commands
      SlashCommand.configure({
        suggestion: slashCommandSuggestion,
      }),
    ],
    content,
    contentType: "markdown",
    editable,
    autofocus: autoFocus ? "end" : false,
    onUpdate: ({ editor: ed }) => {
      const markdown = ed.markdown?.serialize(ed.state.doc.toJSON()) ?? "";
      onUpdate?.(markdown);
    },
  });

  // Helper to get markdown from editor
  const getMarkdown = useCallback(() => {
    if (!editor) {
      return "";
    }
    return editor.markdown?.serialize(editor.state.doc.toJSON()) ?? "";
  }, [editor]);

  // Helper to set markdown content
  const setMarkdown = useCallback(
    (markdown: string) => {
      editor?.commands.setContent(markdown, { contentType: "markdown" });
    },
    [editor]
  );

  return {
    editor,
    getMarkdown,
    setMarkdown,
  };
}
