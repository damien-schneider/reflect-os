"use client";

import { Extension } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback } from "react";

/**
 * Extension to prevent Enter key from creating new lines
 * and handle submit/cancel keyboard shortcuts.
 */
const createSingleLineExtension = ({
  onSubmit,
  onCancel,
}: {
  onSubmit?: (text: string) => void;
  onCancel?: () => void;
}) =>
  Extension.create({
    name: "singleLine",

    addKeyboardShortcuts() {
      return {
        Enter: ({ editor: ed }) => {
          onSubmit?.(ed.getText());
          return true; // Prevent default Enter behavior
        },
        "Shift-Enter": () => true, // Also prevent Shift+Enter
        Escape: () => {
          onCancel?.();
          return true;
        },
      };
    },

    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey("pasteHandler"),
          props: {
            handlePaste: (view: EditorView, event: ClipboardEvent) => {
              const text = event.clipboardData?.getData("text/plain");
              if (text) {
                // Replace newlines with spaces
                const singleLineText = text.replace(/[\r\n]+/g, " ").trim();
                if (singleLineText !== text) {
                  event.preventDefault();
                  view.dispatch(view.state.tr.insertText(singleLineText));
                  return true;
                }
              }
              return false;
            },
          },
        }),
      ];
    },
  });

type UseInlineEditorOptions = {
  /**
   * Initial content for the editor (plain text)
   */
  content?: string;
  /**
   * Callback when content changes
   */
  onUpdate?: (text: string) => void;
  /**
   * Callback when Enter is pressed (useful for saving)
   */
  onSubmit?: (text: string) => void;
  /**
   * Callback when Escape is pressed (useful for canceling)
   */
  onCancel?: () => void;
  /**
   * Whether to auto-focus the editor
   */
  autoFocus?: boolean;
  /**
   * Whether the editor is editable
   */
  editable?: boolean;
  /**
   * Placeholder text when empty
   */
  placeholder?: string;
};

export function useInlineEditor({
  content = "",
  onUpdate,
  onSubmit,
  onCancel,
  autoFocus = false,
  editable = true,
  placeholder = "",
}: UseInlineEditorOptions) {
  const editor = useEditor({
    extensions: [
      // StarterKit provides Document, Paragraph, Text, History, and other basics
      // We disable everything we don't need for a minimal single-line editor
      StarterKit.configure({
        // Disable block-level features
        blockquote: false,
        bulletList: false,
        codeBlock: false,
        hardBreak: false,
        heading: false,
        horizontalRule: false,
        listItem: false,
        orderedList: false,
        // Keep these for basic inline editing
        bold: false,
        code: false,
        italic: false,
        strike: false,
        // Keep document, paragraph, text, history
      }),
      createSingleLineExtension({ onSubmit, onCancel }),
      ...(placeholder
        ? [
            Placeholder.configure({
              placeholder,
            }),
          ]
        : []),
    ],
    content: content ? `<p>${content}</p>` : "",
    editable,
    autofocus: autoFocus ? "end" : false,
    onUpdate: ({ editor: ed }) => {
      const text = ed.getText();
      onUpdate?.(text);
    },
  });

  // Helper to get text from editor
  const getText = useCallback(() => editor?.getText() ?? "", [editor]);

  // Helper to set text content
  const setText = useCallback(
    (text: string) => {
      editor?.commands.setContent(text ? `<p>${text}</p>` : "");
    },
    [editor]
  );

  // Helper to focus the editor
  const focus = useCallback(
    (position?: "start" | "end" | "all" | boolean) => {
      editor?.commands.focus(position);
    },
    [editor]
  );

  // Helper to blur the editor
  const blur = useCallback(() => {
    editor?.commands.blur();
  }, [editor]);

  // Helper to select all text
  const selectAll = useCallback(() => {
    editor?.commands.selectAll();
  }, [editor]);

  return {
    editor,
    getText,
    setText,
    focus,
    blur,
    selectAll,
  };
}
