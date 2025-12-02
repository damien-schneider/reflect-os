import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type EditableTitleProps = {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
};

export function EditableTitle({
  value,
  onSave,
  placeholder = "Untitled",
  className,
  inputClassName,
  disabled = false,
}: EditableTitleProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync from external value when it changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    const trimmedValue = localValue.trim();
    if (trimmedValue && trimmedValue !== value) {
      onSave(trimmedValue);
    } else {
      // Reset to original if empty or unchanged
      setLocalValue(value);
    }
    setIsEditing(false);
  }, [localValue, value, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        setLocalValue(value);
        setIsEditing(false);
      }
    },
    [handleSave, value]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      setIsEditing(true);
    }
  }, [disabled]);

  if (isEditing) {
    return (
      <Input
        className={cn(
          "h-auto border-none px-0 py-1 font-bold text-2xl shadow-none focus-visible:ring-0",
          inputClassName
        )}
        onBlur={handleSave}
        onChange={(e) => setLocalValue(e.target.value)}
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
