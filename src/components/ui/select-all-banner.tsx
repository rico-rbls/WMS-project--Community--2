import { Button } from "./button";
import { CheckCircle2, X } from "lucide-react";
import { cn } from "./utils";

interface SelectAllBannerProps {
  /** Number of items selected on current page */
  pageItemCount: number;
  /** Total number of items across all pages */
  totalItemCount: number;
  /** Whether all items across all pages are selected */
  isAllPagesSelected: boolean;
  /** Whether to show the banner (typically when current page is fully selected) */
  show: boolean;
  /** Callback to select all items across all pages */
  onSelectAllPages: () => void;
  /** Callback to clear selection */
  onClearSelection: () => void;
  /** Optional className for styling */
  className?: string;
  /** Optional item type label (e.g., "items", "orders", "suppliers") */
  itemLabel?: string;
}

export function SelectAllBanner({
  pageItemCount,
  totalItemCount,
  isAllPagesSelected,
  show,
  onSelectAllPages,
  onClearSelection,
  className,
  itemLabel = "items",
}: SelectAllBannerProps) {
  if (!show) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 py-2 px-4 text-sm",
        "bg-primary/10 border-b border-primary/20",
        "animate-in fade-in-0 slide-in-from-top-2 duration-200",
        className
      )}
    >
      <CheckCircle2 className="h-4 w-4 text-primary" />
      
      {isAllPagesSelected ? (
        <>
          <span>
            All <strong>{totalItemCount}</strong> {itemLabel} are selected.
          </span>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-primary font-medium"
            onClick={onClearSelection}
          >
            Clear selection
          </Button>
        </>
      ) : (
        <>
          <span>
            All <strong>{pageItemCount}</strong> {itemLabel} on this page are selected.
          </span>
          {totalItemCount > pageItemCount && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-primary font-medium"
              onClick={onSelectAllPages}
            >
              Select all {totalItemCount} {itemLabel}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

