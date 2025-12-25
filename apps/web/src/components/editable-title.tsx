import { cn } from "@repo/ui/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  InlineEditor,
  type InlineEditorRef,
} from "@/features/editor/components/inline-editor";

type EditableTitleProps = {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  editorClassName?: string;
  disabled?: boolean;
  /**
   * Semantic element type for styling
   */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
  /**
   * Whether to use always-editable mode (TipTap) or click-to-edit mode
   * @default true
   */
  alwaysEditable?: boolean;
};

export function EditableTitle({
  value,
  onSave,
  placeholder = "Untitled",
  className,
  editorClassName,
  disabled = false,
  as,
  alwaysEditable = true,
}: EditableTitleProps) {
  const editorRef = useRef<InlineEditorRef>(null);
  const [localValue, setLocalValue] = useState(value);

  // Sync from external value when it changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSave = useCallback(
    (newValue: string) => {
      const trimmedValue = newValue.trim();
      if (trimmedValue && trimmedValue !== value) {
        onSave(trimmedValue);
      } else {
        // Reset to original if empty or unchanged
        setLocalValue(value);
        editorRef.current?.setText(value);
      }
    },
    [value, onSave]
  );

  const handleCancel = useCallback(() => {
    setLocalValue(value);
    editorRef.current?.setText(value);
    editorRef.current?.blur();
  }, [value]);

  const handleBlur = useCallback(
    (newValue: string) => {
      handleSave(newValue);
    },
    [handleSave]
  );

  if (alwaysEditable) {
    return (
      <InlineEditor
        as={as}
        className={cn(
          "rounded px-2 py-1 transition-colors",
          !disabled && "focus-within:bg-accent/30 hover:bg-accent/50",
          disabled && "cursor-default opacity-70",
          className
        )}
        disabled={disabled}
        editable={!disabled}
        editorClassName={editorClassName}
        onBlur={handleBlur}
        onCancel={handleCancel}
        onChange={setLocalValue}
        onSubmit={handleSave}
        placeholder={placeholder}
        ref={editorRef}
        selectAllOnFocus
        value={localValue}
      />
    );
  }

  // Legacy click-to-edit mode (kept for backward compatibility)
  return (
    <LegacyEditableTitle
      {...{ value, onSave, placeholder, className, disabled }}
    />
  );
}

// Legacy implementation for backward compatibility
function LegacyEditableTitle({
  value,
  onSave,
  placeholder = "Untitled",
  className,
  inputClassName,
  disabled = false,
}: {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmedValue = localValue.trim();
    if (trimmedValue && trimmedValue !== value) {
      onSave(trimmedValue);
    } else {
      setLocalValue(value);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setLocalValue(value);
      setIsEditing(false);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      setIsEditing(true);
    }
  };

  if (isEditing) {
    const { Input } = require("@repo/ui/components/input");
    const { cn: cnUtil } = require("@repo/ui/lib/utils");
    return (
      <Input
        className={cnUtil(
          "h-auto border-none px-0 py-1 font-bold text-2xl shadow-none focus-visible:ring-0",
          inputClassName
        )}
        onBlur={handleSave}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setLocalValue(e.target.value)
        }
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        ref={inputRef}
        value={localValue}
      />
    );
  }

  return (
    <button
      className={cn(
        "-mx-2 w-full cursor-text rounded px-2 py-1 text-left font-bold text-2xl transition-colors",
        !disabled && "hover:bg-accent/50",
        disabled && "cursor-default",
        className
      )}
      disabled={disabled}
      onClick={handleClick}
      type="button"
    >
      {localValue || placeholder}
    </button>
  );
}
