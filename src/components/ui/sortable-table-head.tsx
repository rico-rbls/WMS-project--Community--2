import { TableHead } from "./table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "./utils";
import type { SortDirection } from "../../hooks/useTableSort";

interface SortableTableHeadProps {
  children: React.ReactNode;
  sortKey: string;
  currentSortKey: string | null;
  sortDirection: SortDirection;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableTableHead({
  children,
  sortKey,
  currentSortKey,
  sortDirection,
  onSort,
  className,
}: SortableTableHeadProps) {
  const isActive = currentSortKey === sortKey;

  // Determine aria-sort value
  const ariaSort = isActive
    ? (sortDirection === "asc" ? "ascending" : "descending")
    : undefined;

  // Determine next sort direction for screen reader announcement
  const nextDirection = !isActive ? "ascending" : (sortDirection === "asc" ? "descending" : "ascending");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSort(sortKey);
    }
  };

  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none hover:bg-muted/50 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        isActive && "bg-muted/30",
        className
      )}
      onClick={() => onSort(sortKey)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="columnheader"
      aria-sort={ariaSort}
      aria-label={`Sort by ${children}, currently ${isActive ? sortDirection : "unsorted"}, click to sort ${nextDirection}`}
    >
      <div className="flex items-center gap-1.5">
        <span>{children}</span>
        <span className="inline-flex items-center justify-center w-4 h-4" aria-hidden="true">
          {isActive && sortDirection === "asc" && (
            <ArrowUp className="h-3.5 w-3.5 text-primary" />
          )}
          {isActive && sortDirection === "desc" && (
            <ArrowDown className="h-3.5 w-3.5 text-primary" />
          )}
          {!isActive && (
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
          )}
        </span>
      </div>
    </TableHead>
  );
}

