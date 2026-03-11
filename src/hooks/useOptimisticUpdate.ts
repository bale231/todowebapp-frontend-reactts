import { useState, useCallback } from "react";
import { saveListOptimistic, type LocalTodoList } from "../db/database";
import { queueMutation } from "../services/syncService";

interface OptimisticState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isPending: boolean; // True while waiting for server confirmation
}

interface UseOptimisticUpdateReturn<T> {
  state: OptimisticState<T>;
  execute: (
    optimisticData: T,
    serverAction: () => Promise<T>,
    options?: { queueIfOffline?: boolean; action?: string; endpoint?: string }
  ) => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook for optimistic updates with automatic rollback on failure
 */
export function useOptimisticUpdate<T>(): UseOptimisticUpdateReturn<T> {
  const [state, setState] = useState<OptimisticState<T>>({
    data: null,
    isLoading: false,
    error: null,
    isPending: false,
  });

  const execute = useCallback(
    async (
      optimisticData: T,
      serverAction: () => Promise<T>,
      options?: { queueIfOffline?: boolean; action?: string; endpoint?: string }
    ): Promise<T | null> => {
      const previousData = state.data;

      // Apply optimistic update immediately
      setState({
        data: optimisticData,
        isLoading: false,
        error: null,
        isPending: true,
      });

      try {
        if (!navigator.onLine && options?.queueIfOffline) {
          // Queue for later sync
          if (options.action && options.endpoint) {
            await queueMutation(
              options.action,
              options.endpoint,
              "PATCH",
              optimisticData
            );
          }
          setState((prev) => ({ ...prev, isPending: false }));
          return optimisticData;
        }

        // Try server action
        const serverData = await serverAction();

        setState({
          data: serverData,
          isLoading: false,
          error: null,
          isPending: false,
        });

        return serverData;
      } catch (error) {
        // Rollback on failure
        setState({
          data: previousData,
          isLoading: false,
          error: error instanceof Error ? error : new Error("Unknown error"),
          isPending: false,
        });

        return null;
      }
    },
    [state.data]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
      isPending: false,
    });
  }, []);

  return { state, execute, reset };
}

/**
 * Specialized hook for optimistic list updates
 */
export function useOptimisticListUpdate() {
  const [pendingUpdates, setPendingUpdates] = useState<Map<number, LocalTodoList>>(
    new Map()
  );

  const updateList = useCallback(
    async (
      list: LocalTodoList,
      serverAction: () => Promise<LocalTodoList>
    ): Promise<{ success: boolean; data: LocalTodoList | null }> => {
      // Save to IndexedDB with rollback support
      const { rollback, previousState } = await saveListOptimistic(list);

      // Track pending update
      setPendingUpdates((prev) => new Map(prev).set(list.id, list));

      try {
        if (!navigator.onLine) {
          // Keep optimistic update, will sync later
          return { success: true, data: list };
        }

        const serverData = await serverAction();

        // Remove from pending
        setPendingUpdates((prev) => {
          const next = new Map(prev);
          next.delete(list.id);
          return next;
        });

        return { success: true, data: serverData };
      } catch (error) {
        // Rollback
        await rollback();

        // Remove from pending
        setPendingUpdates((prev) => {
          const next = new Map(prev);
          next.delete(list.id);
          return next;
        });

        console.error("[OptimisticUpdate] Failed, rolled back:", error);
        return { success: false, data: previousState || null };
      }
    },
    []
  );

  return {
    updateList,
    pendingUpdates,
    hasPendingUpdates: pendingUpdates.size > 0,
  };
}
