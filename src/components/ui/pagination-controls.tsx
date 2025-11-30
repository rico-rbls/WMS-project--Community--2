import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "./button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { cn } from "./utils";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
  className?: string;
  /** Available page sizes to choose from */
  pageSizeOptions?: number[];
  /** Callback when page size changes */
  onPageSizeChange?: (pageSize: number) => void;
  /** Show compact version on mobile */
  compact?: boolean;
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
  className = "",
  pageSizeOptions = [10, 20, 50, 100],
  onPageSizeChange,
  compact = false,
}: PaginationControlsProps) {
  // Calculate visible page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = compact ? 5 : 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1 && !onPageSizeChange) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4 pt-4 border-t",
        "sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      {/* Left side: Items info and page size selector */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>
          Showing{" "}
          <span className="font-medium text-foreground tabular-nums">{startItem}</span>
          {" - "}
          <span className="font-medium text-foreground tabular-nums">{endItem}</span>
          {" of "}
          <span className="font-medium text-foreground tabular-nums">{totalItems}</span>
        </span>

        {/* Page size selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">•</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => onPageSizeChange(parseInt(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs">per page</span>
          </div>
        )}
      </div>

      {/* Right side: Pagination controls */}
      {totalPages > 1 && (
        <nav className="flex items-center gap-1" role="navigation" aria-label="Pagination">
          {/* First page - hidden on compact mobile */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className={cn("h-8 w-8", compact && "hidden sm:inline-flex")}
            aria-label="Go to first page"
            title="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Previous page */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 w-8"
            aria-label="Go to previous page"
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page numbers - responsive display */}
          <div className="flex items-center gap-1">
            {/* Mobile: Show current/total */}
            <span className="sm:hidden px-2 text-sm tabular-nums">
              {currentPage} / {totalPages}
            </span>

            {/* Desktop: Show page buttons */}
            <div className="hidden sm:flex items-center gap-1">
              {pageNumbers.map((page, index) => {
                if (page === '...') {
                  return (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-1.5 text-muted-foreground select-none"
                      aria-hidden="true"
                    >
                      ⋯
                    </span>
                  );
                }

                const isCurrentPage = currentPage === page;
                return (
                  <Button
                    key={page}
                    variant={isCurrentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(page as number)}
                    className={cn(
                      "h-8 min-w-[2rem] tabular-nums",
                      isCurrentPage && "pointer-events-none"
                    )}
                    aria-label={`Go to page ${page}`}
                    aria-current={isCurrentPage ? "page" : undefined}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Next page */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8 w-8"
            aria-label="Go to next page"
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last page - hidden on compact mobile */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className={cn("h-8 w-8", compact && "hidden sm:inline-flex")}
            aria-label="Go to last page"
            title="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </nav>
      )}
    </div>
  );
}

