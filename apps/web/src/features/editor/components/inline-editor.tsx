"use client";

import { cn } from "@repo/ui/lib/utils";
import { EditorContent } from "@tiptap/react";
import { type Ref, useEffect, useImperativeHandle } from "react";
import { useInlineEditor } from "@/features/editor/hooks/use-inline-editor";

interface InlineEditorProps {
  /**
   * Initial value (plain text)
   */
  value?: string;
  /**
   * Callback when value changes
   */
  onChange?: (value: string) => void;
  /**
   * Callback when Enter is pressed (useful for saving)
   */
  onSubmit?: (value: string) => void;
  /**
   * Callback when Escape is pressed (useful for canceling)
   */
  onCancel?: () => void;
  /**
   * Callback when editor loses focus
   */
  onBlur?: (value: string) => void;
  /**
   * Placeholder text when empty
   */
  placeholder?: string;
  /**
   * CSS class for the container
   */
  className?: string;
  /**
   * CSS class for the editor content itself
   */
  editorClassName?: string;
  /**
   * Whether the editor is editable
   */
  editable?: boolean;
  /**
   * Whether to auto-focus on mount
   */
  autoFocus?: boolean;
  /**
   * Whether to select all text on focus
   */
  selectAllOnFocus?: boolean;
  /**
   * Semantic element type for styling (renders as this element type visually)
   * Note: The actual rendered element is always a div with ProseMirror,
   * but this adds the appropriate CSS class for semantic styling
   */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
  /**
   * Whether the component is disabled
   */
  disabled?: boolean;
  /**
   * Ref for imperative methods (React 19 ref as prop)
   */
  ref?: Ref<InlineEditorRef>;
}

export interface InlineEditorRef {
  focus: (position?: "start" | "end" | "all" | boolean) => void;
  blur: () => void;
  getText: () => string;
  setText: (text: string) => void;
  selectAll: () => void;
}

/**
 * A minimalist single-line TipTap editor that is easy to style.
 *
 * Features:
 * - Single-line only (Enter submits, line breaks are blocked)
 * - Easy styling via className and editorClassName
 * - Semantic element support via `as` prop for visual styling
 * - Placeholder support
 * - Full keyboard support (Enter to submit, Escape to cancel)
 *
 * @example
 * ```tsx
 * <InlineEditor
 *   value={title}
 *   onChange={setTitle}
 *   onSubmit={handleSave}
 *   placeholder="Enter title..."
 *   as="h1"
 *   className="font-bold text-2xl"
 * />
 * ```
 */
export function InlineEditor({
  value = "",
  onChange,
  onSubmit,
  onCancel,
  onBlur,
  placeholder = "",
  className,
  editorClassName,
  editable = true,
  autoFocus = false,
  selectAllOnFocus = false,
  as,
  disabled = false,
  ref,
}: InlineEditorProps) {
  const isEditable = editable && !disabled;

  const { editor, getText, setText, focus, blur, selectAll } = useInlineEditor({
    content: value,
    onUpdate: onChange,
    onSubmit,
    onCancel,
    autoFocus,
    editable: isEditable,
    placeholder,
  });

  // Expose methods via ref
  useImperativeHandle(
    ref,
    () => ({
      focus,
      blur,
      getText,
      setText,
      selectAll,
    }),
    [focus, blur, getText, setText, selectAll]
  );

  // Sync external value changes - only update if truly different
  useEffect(() => {
    if (!editor) {
      return;
    }

    const currentText = getText();
    // Only sync if the external value is actually different from current editor content
    // This prevents infinite loops when onChange updates the parent state
    if (value !== currentText) {
      // Temporarily disable updates while syncing
      setText(value);
    }
  }, [value, editor, getText, setText]);

  // Handle blur event
  useEffect(() => {
    if (!editor) {
      return;
    }
    if (!onBlur) {
      return;
    }

    const handleBlur = () => {
      onBlur(getText());
    };

    editor.on("blur", handleBlur);
    return () => {
      editor.off("blur", handleBlur);
    };
  }, [editor, onBlur, getText]);

  // Handle select all on focus
  useEffect(() => {
    if (!editor) {
      return;
    }
    if (!selectAllOnFocus) {
      return;
    }

    const handleFocus = () => {
      // Small delay to ensure focus is complete
      setTimeout(() => {
        selectAll();
      }, 0);
    };

    editor.on("focus", handleFocus);
    return () => {
      editor.off("focus", handleFocus);
    };
  }, [editor, selectAllOnFocus, selectAll]);

  if (!editor) {
    // Return a placeholder that matches the expected layout
    return (
      <div
        className={cn(
          "inline-editor inline-editor--loading",
          as && `inline-editor--${as}`,
          className
        )}
      >
        <span className="opacity-50">{placeholder || "\u00A0"}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-editor",
        as && `inline-editor--${as}`,
        disabled && "inline-editor--disabled",
        !isEditable && "inline-editor--readonly",
        className
      )}
      data-disabled={disabled || undefined}
      data-readonly={!isEditable || undefined}
    >
      <EditorContent
        className={cn("inline-editor-content", editorClassName)}
        editor={editor}
      />
    </div>
  );
}

InlineEditor.displayName = "InlineEditor";
