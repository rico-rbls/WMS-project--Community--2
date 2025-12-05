import { useState, useMemo, useCallback } from "react";

/**
 * Enhanced batch selection hook that supports selecting items across all pages.
 *
 * @param pageItems - Items on the current page (used for toggle all on current page)
 * @param allItems - Optional: All items across all pages (used for "select all pages" feature)
 */
export function useBatchSelection<T extends { id: string }>(
  pageItems: T[],
  allItems?: T[]
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAllPagesSelected, setIsAllPagesSelected] = useState(false);

  // For backward compatibility, use pageItems if allItems not provided
  const totalItems = allItems ?? pageItems;

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    // When manually toggling, we're no longer in "all pages" mode
    setIsAllPagesSelected(false);
  }, []);

  // Toggle all items on current page only
  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const pageIds = new Set(pageItems.map((item) => item.id));
      const allPageItemsSelected = pageItems.length > 0 &&
        pageItems.every((item) => prev.has(item.id));

      if (allPageItemsSelected) {
        // Deselect all page items
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      }
      // Select all page items (add to existing selection)
      return new Set([...prev, ...pageIds]);
    });
    setIsAllPagesSelected(false);
  }, [pageItems]);

  // Select all items on current page
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(pageItems.map((item) => item.id)));
    setIsAllPagesSelected(false);
  }, [pageItems]);

  // Select all items across ALL pages
  const selectAllPages = useCallback(() => {
    setSelectedIds(new Set(totalItems.map((item) => item.id)));
    setIsAllPagesSelected(true);
  }, [totalItems]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
    setIsAllPagesSelected(false);
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  // Check if all items on current page are selected
  const isAllPageSelected = useMemo(
    () => pageItems.length > 0 && pageItems.every((item) => selectedIds.has(item.id)),
    [pageItems, selectedIds]
  );

  // Legacy: alias for backward compatibility
  const isAllSelected = isAllPageSelected;

  const isPartiallySelected = useMemo(
    () => selectedIds.size > 0 && !isAllPageSelected,
    [selectedIds.size, isAllPageSelected]
  );

  const selectionCount = selectedIds.size;

  const hasSelection = selectedIds.size > 0;

  // Get selected items from all items (not just current page)
  const selectedItems = useMemo(
    () => totalItems.filter((item) => selectedIds.has(item.id)),
    [totalItems, selectedIds]
  );

  // Total count of all items (for showing "Select all X items" option)
  const totalItemCount = totalItems.length;

  // Count of items on current page
  const pageItemCount = pageItems.length;

  // Whether we can show the "select all pages" option
  const canSelectAllPages = useMemo(
    () => allItems !== undefined &&
          isAllPageSelected &&
          totalItems.length > pageItems.length &&
          !isAllPagesSelected,
    [allItems, isAllPageSelected, totalItems.length, pageItems.length, isAllPagesSelected]
  );

  return {
    selectedIds,
    toggleItem,
    toggleAll,
    selectAll,
    selectAllPages,
    deselectAll,
    isSelected,
    isAllSelected,
    isAllPageSelected,
    isAllPagesSelected,
    isPartiallySelected,
    selectionCount,
    hasSelection,
    selectedItems,
    totalItemCount,
    pageItemCount,
    canSelectAllPages,
  };
}

