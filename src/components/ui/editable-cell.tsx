import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Badge } from "./badge";
import { Check, X, Pencil } from "lucide-react";
import { cn } from "./utils";

export interface EditableCellOption {
  value: string;
  label: string;
}

export interface EditableCellProps {
  value: string | number;
  displayValue?: string | React.ReactNode;
  type?: "text" | "number" | "select" | "badge";
  options?: EditableCellOption[];
  onSave: (newValue: string | number) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
  min?: number;
  step?: number;
  placeholder?: string;
  badgeClassName?: string;
}

export function EditableCell({
  value,
  displayValue,
  type = "text",
  options = [],
  onSave,
  disabled = false,
  className,
  min,
  step,
  placeholder,
  badgeClassName,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(String(value));
  }, [value]);

  const handleSave = useCallback(async () => {
    if (editValue === String(value)) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const newValue = type === "number" ? Number(editValue) : editValue;
      await onSave(newValue);
      setIsEditing(false);
    } catch (error) {
      setEditValue(String(value));
    } finally {
      setIsSaving(false);
    }
  }, [editValue, value, type, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(String(value));
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  if (disabled) {
    return <span className={className}>{displayValue ?? value}</span>;
  }

  if (isEditing) {
    if (type === "select" || type === "badge") {
      return (
        <div className="flex items-center gap-1">
          <Select value={editValue} onValueChange={(v) => { setEditValue(v); }}>
            <SelectTrigger className="h-8 min-w-[100px]">
              <SelectValue placeholder={placeholder || "Select..."} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button onClick={handleSave} disabled={isSaving} className="p-1 hover:bg-green-100 dark:hover:bg-green-900 rounded" title="Save">
            <Check className="h-4 w-4 text-green-600" />
          </button>
          <button onClick={handleCancel} disabled={isSaving} className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded" title="Cancel">
            <X className="h-4 w-4 text-red-600" />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          min={min}
          step={step}
          placeholder={placeholder}
          className="h-8 w-auto min-w-[80px]"
          disabled={isSaving}
        />
      </div>
    );
  }

  const content = type === "badge" ? (
    <Badge variant="secondary" className={cn("cursor-pointer hover:ring-2 hover:ring-primary/50", badgeClassName)}>
      {displayValue ?? value}
    </Badge>
  ) : (
    <span>{displayValue ?? value}</span>
  );

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={cn(
        "group flex items-center gap-1 text-left hover:bg-muted/50 px-1 py-0.5 rounded -mx-1 transition-colors",
        className
      )}
      title="Click to edit"
    >
      {content}
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

