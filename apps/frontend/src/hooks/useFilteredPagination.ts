import type { QueryKey } from '@tanstack/react-query';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { useDebouncedValue } from './useDebouncedValue';

interface UseFilteredPaginationOptions<TFilters extends Record<string, string>, TData> {
  queryKey: QueryKey;
  queryFn: (ctx: { filters: TFilters; page: number }) => Promise<TData>;
  defaultFilters: TFilters;
  /** Debounce delay applied to the entire filter object. Default: 300ms. */
  debounceMs?: number;
  refetchInterval?: number | false;
  enabled?: boolean;
  /** Use keepPreviousData to avoid loading flicker on page/filter change. */
  keepPrevious?: boolean;
}

/**
 * Centralises filter state, debounce, page reset, and data fetching for
 * any paginated list that accepts string-valued filters.
 *
 * - `filters`         — raw (immediate) filter values, bind to controlled inputs
 * - `debouncedFilters`— debounced snapshot used for querying
 * - page resets to 1 automatically whenever `debouncedFilters` changes
 */
export function useFilteredPagination<TFilters extends Record<string, string>, TData>({
  queryKey,
  queryFn,
  defaultFilters,
  debounceMs = 300,
  refetchInterval,
  enabled,
  keepPrevious = false,
}: UseFilteredPaginationOptions<TFilters, TData>) {
  const [filters, setFilters] = useState<TFilters>(defaultFilters);
  const [page, setPage] = useState(1);

  const defaultFiltersRef = useRef(defaultFilters);
  const isFirstDebounce = useRef(true);

  const handleDebouncedChange = useCallback(() => {
    if (isFirstDebounce.current) {
      isFirstDebounce.current = false;
      return;
    }
    setPage(1);
  }, []);

  const debouncedFilters = useDebouncedValue(filters, debounceMs, handleDebouncedChange);

  const setFilter = useCallback(<K extends keyof TFilters>(key: K, value: TFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFiltersRef.current);
    setPage(1);
  }, []);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: [...(queryKey as unknown[]), page, debouncedFilters],
    queryFn: () => queryFn({ filters: debouncedFilters, page }),
    refetchInterval,
    enabled,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
  });

  return {
    data,
    filters,
    debouncedFilters,
    setFilter,
    resetFilters,
    page,
    setPage,
    isLoading,
    isFetching,
    isError,
    refetch,
  };
}
