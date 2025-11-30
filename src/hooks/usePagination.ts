import { useState, useEffect, useMemo } from 'react';

export interface PaginationResult<T> {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  paginatedData: T[];
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  totalItems: number;
  itemsPerPage: number;
}

/**
 * Custom hook for pagination logic
 * @param data - Array of data to paginate
 * @param itemsPerPage - Number of items per page (default: 25)
 * @returns Pagination info and controls
 */
export function usePagination<T>(
  data: T[],
  itemsPerPage: number = 25
): PaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(data.length / itemsPerPage)),
    [data.length, itemsPerPage]
  );

  // Reset to page 1 when data changes significantly
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const { startIndex, endIndex, paginatedData } = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, data.length);
    return {
      startIndex: start,
      endIndex: end,
      paginatedData: data.slice(start, end),
    };
  }, [data, currentPage, itemsPerPage]);

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const firstPage = () => {
    setCurrentPage(1);
  };

  const lastPage = () => {
    setCurrentPage(totalPages);
  };

  return {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedData,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    canGoNext: currentPage < totalPages,
    canGoPrevious: currentPage > 1,
    totalItems: data.length,
    itemsPerPage,
  };
}

