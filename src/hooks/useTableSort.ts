import { useState, useMemo, useCallback } from "react";

export type SortDirection = "asc" | "desc" | null;

export interface SortConfig<T> {
  key: keyof T | null;
  direction: SortDirection;
}

export interface UseTableSortResult<T> {
  sortedData: T[];
  sortConfig: SortConfig<T>;
  requestSort: (key: keyof T) => void;
  getSortDirection: (key: keyof T) => SortDirection;
  clearSort: () => void;
}

/**
 * Custom hook for table sorting functionality
 * @param data - The array of data to sort
 * @param defaultSortKey - Optional default sort key
 * @param defaultDirection - Optional default sort direction
 */
export function useTableSort<T>(
  data: T[],
  defaultSortKey?: keyof T,
  defaultDirection: SortDirection = "asc"
): UseTableSortResult<T> {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>({
    key: defaultSortKey ?? null,
    direction: defaultSortKey ? defaultDirection : null,
  });

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return data;
    }

    const sorted = [...data].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === "asc" ? 1 : -1;
      if (bValue == null) return sortConfig.direction === "asc" ? -1 : 1;

      // Handle different types
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue, undefined, { 
          sensitivity: "base",
          numeric: true 
        });
        return sortConfig.direction === "asc" ? comparison : -comparison;
      }

      // Fallback: convert to string and compare
      const aStr = String(aValue);
      const bStr = String(bValue);
      const comparison = aStr.localeCompare(bStr, undefined, { sensitivity: "base" });
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [data, sortConfig]);

  const requestSort = useCallback((key: keyof T) => {
    setSortConfig((prev) => {
      // If clicking the same column
      if (prev.key === key) {
        // Cycle through: asc -> desc -> null
        if (prev.direction === "asc") {
          return { key, direction: "desc" };
        } else if (prev.direction === "desc") {
          return { key: null, direction: null };
        }
      }
      // New column: start with ascending
      return { key, direction: "asc" };
    });
  }, []);

  const getSortDirection = useCallback(
    (key: keyof T): SortDirection => {
      if (sortConfig.key === key) {
        return sortConfig.direction;
      }
      return null;
    },
    [sortConfig]
  );

  const clearSort = useCallback(() => {
    setSortConfig({ key: null, direction: null });
  }, []);

  return {
    sortedData,
    sortConfig,
    requestSort,
    getSortDirection,
    clearSort,
  };
}

