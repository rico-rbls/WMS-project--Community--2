import { Button } from "./button";
import { X, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export interface BulkAction {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  disabled?: boolean;
}

export interface BulkActionGroup {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  options: { label: string; value: string }[];
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
}

export function BulkActionsToolbar({
  selectionCount,
  onClearSelection,
  actions = [],
  actionGroups = [],
  isLoading = false,
  className,
}: BulkActionsToolbarProps) {
  if (selectionCount === 0) return null;

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg p-3 flex items-center gap-3 ${className || ""}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {selectionCount} item{selectionCount !== 1 ? "s" : ""} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={isLoading}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-6 w-px bg-border" />

      <div className="flex items-center gap-2">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || "outline"}
            size="sm"
            onClick={action.onClick}
            disabled={action.disabled || isLoading}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}

        {actionGroups.map((group, index) => (
          <Select
            key={index}
            onValueChange={group.onSelect}
            disabled={group.disabled || isLoading}
          >
            <SelectTrigger className="h-8 w-auto gap-1">
              {group.icon}
              <SelectValue placeholder={group.label} />
              <ChevronDown className="h-3 w-3 opacity-50" />
            </SelectTrigger>
            <SelectContent>
              {group.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>
    </div>
  );
}

