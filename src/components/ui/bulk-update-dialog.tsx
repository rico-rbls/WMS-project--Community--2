import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export interface BulkUpdateField {
  type: "text" | "number" | "select";
  label: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  min?: number;
  step?: number;
  validate?: (value: string) => string | null;
}

export interface BulkUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  itemCount: number;
  itemNames?: string[];
  field: BulkUpdateField;
  onConfirm: (value: string) => void;
  isLoading?: boolean;
}

export function BulkUpdateDialog({
  open,
  onOpenChange,
  title,
  description,
  itemCount,
  field,
  onConfirm,
  isLoading = false,
}: BulkUpdateDialogProps) {
  const [value, setValue] = useState("");

  const handleConfirm = () => {
    if (value) {
      onConfirm(value);
      setValue("");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setValue("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description} ({itemCount} item{itemCount !== 1 ? "s" : ""})
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label htmlFor="bulk-update-field">{field.label}</Label>
          {field.type === "select" && field.options ? (
            <Select value={value} onValueChange={setValue}>
              <SelectTrigger id="bulk-update-field" className="mt-2">
                <SelectValue placeholder={field.placeholder || "Select..."} />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="bulk-update-field"
              type={field.type}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={field.placeholder}
              min={field.min}
              step={field.step}
              className="mt-2"
            />
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || !value}>
            {isLoading ? "Updating..." : `Update ${itemCount} item${itemCount !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

