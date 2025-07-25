import { useQuery, QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface UseSupabaseQueryOptions<T> {
  queryKey: QueryKey;
  table: string;
  select?: string;
  order?: { column: string; ascending: boolean };
  filter?: {
    column: string;
    operator: string; // 'eq', 'gt', 'lt', etc.
    value: unknown;
  }[];
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  onSuccess?: (data: T[]) => void;
  onError?: (error: PostgrestError) => void;
  showLoadingToast?: boolean;
  showErrorToast?: boolean;
  disableRefetchOnWindowFocus?: boolean;
}

/**
 * A custom hook for fetching data from Supabase with React Query
 */
export function useSupabaseQuery<T = Record<string, unknown>>(
  options: UseSupabaseQueryOptions<T>
) {
  const {
    queryKey,
    table,
    select = "*",
    order,
    filter,
    enabled = true,
    staleTime = 60 * 1000, // 1 minute
    cacheTime = 5 * 60 * 1000, // 5 minutes
    onSuccess,
    onError,
    showLoadingToast = false,
    showErrorToast = true,
    disableRefetchOnWindowFocus = false,
  } = options;

  return useQuery({
    queryKey,
    queryFn: async () => {
      let toastId;
      if (showLoadingToast) {
        toastId = toast.loading(`Loading ${table} data...`);
      }

      try {
        console.log(`Fetching data from ${table}...`);

        // Start the query
        let query = supabase.from(table).select(select);

        // Apply filters if any
        if (filter && filter.length > 0) {
          filter.forEach((f) => {
            query = query.filter(f.column, f.operator, f.value);
          });
        }

        // Apply ordering if specified
        if (order) {
          query = query.order(order.column, { ascending: order.ascending });
        }

        // Execute the query
        const { data, error } = await query;

        // Handle errors
        if (error) {
          console.error(`Error fetching data from ${table}:`, error);

          if (showErrorToast) {
            if (toastId) toast.dismiss(toastId);
            toast.error(`Failed to load ${table}: ${error.message}`);
          }

          if (onError) onError(error);
          throw error;
        }

        // Log success and dismiss loading toast
        if (toastId) toast.dismiss(toastId);
        console.log(
          `Successfully fetched ${data?.length || 0} records from ${table}`
        );

        // Call onSuccess callback if provided
        if (onSuccess && data) onSuccess(data as T[]);

        return (data as T[]) || [];
      } catch (error) {
        console.error("Error in useSupabaseQuery:", error);
        if (toastId) toast.dismiss(toastId);
        throw error;
      }
    },
    enabled,
    staleTime,
    gcTime: cacheTime,
    refetchOnWindowFocus: !disableRefetchOnWindowFocus,
    retry: 1,
  });
}

export default useSupabaseQuery;
