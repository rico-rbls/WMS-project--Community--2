import { LucideIcon, Plus, Search, SearchX, FileX } from "lucide-react";
import { Button } from "./button";
import { cn } from "./utils";

type EmptyStateVariant = "default" | "search" | "error" | "minimal";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  variant?: EmptyStateVariant;
  className?: string;
  disabled?: boolean;
  disabledMessage?: string;
}

const variantStyles: Record<EmptyStateVariant, {
  iconBg: string;
  iconColor: string;
  defaultIcon: LucideIcon;
}> = {
  default: {
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    defaultIcon: FileX,
  },
  search: {
    iconBg: "bg-blue-50 dark:bg-blue-950/30",
    iconColor: "text-blue-500 dark:text-blue-400",
    defaultIcon: Search,
  },
  error: {
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    defaultIcon: FileX,
  },
  minimal: {
    iconBg: "bg-transparent",
    iconColor: "text-muted-foreground/50",
    defaultIcon: FileX,
  },
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Plus,
  secondaryActionLabel,
  onSecondaryAction,
  variant = "default",
  className,
  disabled = false,
  disabledMessage,
}: EmptyStateProps) {
  const styles = variantStyles[variant];
  const Icon = icon || styles.defaultIcon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        variant === "minimal" && "py-8",
        className
      )}
    >
      <div
        className={cn(
          "rounded-full p-5 mb-4 transition-colors",
          styles.iconBg,
          variant === "minimal" && "p-3 mb-3"
        )}
      >
        <Icon
          className={cn(
            "h-10 w-10",
            styles.iconColor,
            variant === "minimal" && "h-8 w-8"
          )}
        />
      </div>

      <h3
        className={cn(
          "text-lg font-semibold text-foreground mb-2",
          variant === "minimal" && "text-base"
        )}
      >
        {title}
      </h3>

      <p
        className={cn(
          "text-sm text-muted-foreground mb-6 max-w-md leading-relaxed",
          variant === "minimal" && "mb-4 max-w-xs"
        )}
      >
        {description}
      </p>

      {/* Action buttons */}
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <Button
              onClick={onAction}
              disabled={disabled}
              title={disabled && disabledMessage ? disabledMessage : undefined}
              size={variant === "minimal" ? "sm" : "default"}
            >
              <ActionIcon className="h-4 w-4 mr-1.5" />
              {actionLabel}
            </Button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="outline"
              onClick={onSecondaryAction}
              size={variant === "minimal" ? "sm" : "default"}
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}

      {/* Disabled message hint */}
      {disabled && disabledMessage && (
        <p className="text-xs text-muted-foreground mt-3 italic">
          {disabledMessage}
        </p>
      )}
    </div>
  );
}

// Specialized empty states for common use cases
interface NoResultsEmptyStateProps {
  searchTerm?: string;
  onClearSearch?: () => void;
  entityName?: string;
}

export function NoResultsEmptyState({
  searchTerm,
  onClearSearch,
  entityName = "items",
}: NoResultsEmptyStateProps) {
  return (
    <EmptyState
      variant="search"
      icon={searchTerm ? SearchX : Search}
      title={searchTerm ? "No results found" : `No ${entityName} yet`}
      description={
        searchTerm
          ? `No ${entityName} match "${searchTerm}". Try adjusting your search or filters.`
          : `Get started by adding your first ${entityName.replace(/s$/, "")}.`
      }
      actionLabel={searchTerm ? "Clear search" : undefined}
      onAction={onClearSearch}
    />
  );
}

