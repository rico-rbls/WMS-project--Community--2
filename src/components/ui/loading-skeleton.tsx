import { Skeleton } from "./skeleton";

interface TableLoadingSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  showCheckbox?: boolean;
}

export function TableLoadingSkeleton({
  rows = 5,
  columns = 5,
  showHeader = true,
  showCheckbox = false,
}: TableLoadingSkeletonProps) {
  return (
    <div className="w-full">
      {/* Table Header Skeleton */}
      {showHeader && (
        <div className="flex items-center border-b py-3 px-4 gap-4">
          {showCheckbox && <Skeleton className="h-4 w-4 rounded" />}
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={`header-${i}`}
              className="h-4 flex-1"
              style={{ maxWidth: i === 0 ? "150px" : i === columns - 1 ? "80px" : "100px" }}
            />
          ))}
        </div>
      )}
      {/* Table Rows Skeleton */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center border-b py-4 px-4 gap-4 animate-pulse"
          style={{ animationDelay: `${rowIndex * 50}ms` }}
        >
          {showCheckbox && <Skeleton className="h-4 w-4 rounded" />}
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              className="h-4 flex-1"
              style={{
                maxWidth: colIndex === 0 ? "150px" : colIndex === columns - 1 ? "80px" : "120px",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface CardLoadingSkeletonProps {
  showHeader?: boolean;
  showFooter?: boolean;
  contentHeight?: string;
}

export function CardLoadingSkeleton({
  showHeader = true,
  showFooter = false,
  contentHeight = "h-32",
}: CardLoadingSkeletonProps) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      {showHeader && (
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      )}
      <Skeleton className={`w-full ${contentHeight}`} />
      {showFooter && (
        <div className="flex justify-end gap-2 pt-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      )}
    </div>
  );
}

interface StatsCardSkeletonProps {
  count?: number;
}

export function StatsCardsSkeleton({ count = 4 }: StatsCardSkeletonProps) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border bg-card p-6 space-y-3"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

interface FormFieldSkeletonProps {
  count?: number;
  showLabels?: boolean;
}

export function FormFieldsSkeleton({ count = 4, showLabels = true }: FormFieldSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          {showLabels && <Skeleton className="h-4 w-24" />}
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
