import { Button } from "./button";
import { X, ChevronDown, Loader2, CheckCircle2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { cn } from "./utils";
import { Badge } from "./badge";

export interface BulkAction {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  disabled?: boolean;
  /** Mobile-only: Show only icon on small screens */
  iconOnly?: boolean;
}

export interface BulkActionGroup {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  options: { label: string; value: string; icon?: React.ReactNode }[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}

interface BulkActionsToolbarProps {
  selectionCount: number;
  onClearSelection: () => void;
  actions?: BulkAction[];
  actionGroups?: BulkActionGroup[];
  isLoading?: boolean;
  className?: string;
  /** Total number of items that can be selected */
  totalItems?: number;
  onSelectAll?: () => void;
}

export function BulkActionsToolbar({
  selectionCount,
  onClearSelection,
  actions = [],
  actionGroups = [],
  isLoading = false,
  className,
  totalItems,
  onSelectAll,
}: BulkActionsToolbarProps) {
  if (selectionCount === 0) return null;

  const canSelectMore = totalItems && selectionCount < totalItems;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80",
        "border rounded-xl shadow-lg",
        "p-2 sm:p-3",
        "flex flex-wrap items-center gap-2 sm:gap-3",
        "max-w-[95vw] sm:max-w-none",
        "animate-in slide-in-from-bottom-4 fade-in-0 duration-200",
        className
      )}
      role="toolbar"
      aria-label="Bulk actions"
    >
      {/* Selection Info */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="h-7 px-2.5 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-primary" />
          <span className="tabular-nums">{selectionCount}</span>
          <span className="hidden sm:inline ml-1">
            item{selectionCount !== 1 ? "s" : ""} selected
          </span>
        </Badge>

        {/* Select All Link */}
        {canSelectMore && onSelectAll && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs hidden sm:inline-flex"
            onClick={onSelectAll}
            disabled={isLoading}
          >
            Select all {totalItems}
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClearSelection}
          disabled={isLoading}
          aria-label="Clear selection"
          title="Clear selection"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-border hidden sm:block" aria-hidden="true" />

      {/* Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Loading" />
        )}

        {actions.map((action, index) => (
          <Button
            key={action.id || index}
            variant={action.variant || "outline"}
            size="sm"
            onClick={action.onClick}
            disabled={action.disabled || isLoading}
            className={cn(
              "h-8",
              action.iconOnly && "sm:w-auto px-2 sm:px-3"
            )}
            title={action.iconOnly ? action.label : undefined}
          >
            {action.icon}
            <span className={cn(action.iconOnly && "hidden sm:inline")}>
              {action.label}
            </span>
          </Button>
        ))}

        {actionGroups.map((group, index) => (
          <Select
            key={group.id || index}
            onValueChange={group.onSelect}
            disabled={group.disabled || isLoading}
          >
            <SelectTrigger className="h-8 w-auto gap-1 px-2 sm:px-3">
              {group.icon}
              <SelectValue placeholder={group.label} />
              <ChevronDown className="h-3 w-3 opacity-50" />
            </SelectTrigger>
            <SelectContent>
              {group.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    {option.icon}
                    {option.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>
    </div>
  );
}

