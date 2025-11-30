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

  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none hover:bg-muted/50 transition-colors",
        isActive && "bg-muted/30",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        <span>{children}</span>
        <span className="inline-flex items-center justify-center w-4 h-4">
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

