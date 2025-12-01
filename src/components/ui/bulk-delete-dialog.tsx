import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";
import { AlertTriangle } from "lucide-react";

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemCount: number;
  itemNames?: string[];
  itemType?: string;
  onConfirm: () => void;
  isLoading?: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  itemCount,
  itemNames = [],
  itemType = "item",
  onConfirm,
  isLoading = false,
  title,
  description,
  confirmLabel,
}: BulkDeleteDialogProps) {
  const pluralType = itemCount === 1 ? itemType : `${itemType}s`;
  const defaultTitle = `Delete ${itemCount} ${pluralType}?`;
  const defaultDescription = `This action cannot be undone. The following ${pluralType} will be permanently deleted:`;
  const defaultConfirmLabel = `Delete ${itemCount} ${pluralType}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {title || defaultTitle}
          </DialogTitle>
          <DialogDescription>
            {description || defaultDescription}
          </DialogDescription>
        </DialogHeader>

        {itemNames.length > 0 && (
          <div className="max-h-40 overflow-y-auto rounded-md border p-3">
            <ul className="space-y-1 text-sm">
              {itemNames.slice(0, 10).map((name, index) => (
                <li key={index} className="text-muted-foreground">
                  • {name}
                </li>
              ))}
              {itemNames.length > 10 && (
                <li className="text-muted-foreground italic">
                  ...and {itemNames.length - 10} more
                </li>
              )}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : (confirmLabel || defaultConfirmLabel)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

