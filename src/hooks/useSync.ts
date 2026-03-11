import { useState, useEffect, useCallback, useRef } from "react";
import {
  fullSync,
  addSyncListener,
  enableAutoSync,
  disableAutoSync,
} from "../services/syncService";
import type { LocalTodoList, MergeResult } from "../db/database";

interface SyncState {
  isSyncing: boolean;
  lastSyncAt: Date | null;
  error: string | null;
  conflicts: Array<{ local: LocalTodoList; server: LocalTodoList }>;
  progress: { current: number; total: number } | null;
}

interface UseSyncOptions {
  autoSyncOnMount?: boolean;
  autoSyncOnReconnect?: boolean;
  syncIntervalMs?: number; // Auto-sync interval (0 = disabled)
}

/**
 * Hook for managing sync state and operations
 */
export function useSync(options: UseSyncOptions = {}) {
  const {
    autoSyncOnMount = false,
    autoSyncOnReconnect = true,
    syncIntervalMs = 0,
  } = options;

  const [state, setState] = useState<SyncState>({
    isSyncing: false,
    lastSyncAt: null,
    error: null,
    conflicts: [],
    progress: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Listen to sync events
  useEffect(() => {
    const unsubscribe = addSyncListener((event) => {
      switch (event.type) {
        case "start":
          setState((prev) => ({
            ...prev,
            isSyncing: true,
            error: null,
            progress: null,
          }));
          break;

        case "progress":
          if (event.progress) {
            setState((prev) => ({
              ...prev,
              progress: event.progress!,
            }));
          }
          break;

        case "conflict":
          if (event.conflicts) {
            setState((prev) => ({
              ...prev,
              conflicts: event.conflicts!,
            }));
          }
          break;

        case "complete":
          setState((prev) => ({
            ...prev,
            isSyncing: false,
            lastSyncAt: new Date(),
            progress: null,
          }));
          break;

        case "error":
          setState((prev) => ({
            ...prev,
            isSyncing: false,
            error: event.message || "Sync failed",
            progress: null,
          }));
          break;
      }
    });

    return unsubscribe;
  }, []);

  // Auto-sync on reconnect
  useEffect(() => {
    if (autoSyncOnReconnect) {
      enableAutoSync();
      return () => disableAutoSync();
    }
  }, [autoSyncOnReconnect]);

  // Auto-sync on mount
  useEffect(() => {
    if (autoSyncOnMount && navigator.onLine) {
      fullSync().catch(console.error);
    }
  }, [autoSyncOnMount]);

  // Periodic auto-sync
  useEffect(() => {
    if (syncIntervalMs > 0) {
      intervalRef.current = setInterval(() => {
        if (navigator.onLine && !state.isSyncing) {
          fullSync().catch(console.error);
        }
      }, syncIntervalMs);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [syncIntervalMs, state.isSyncing]);

  // Manual sync trigger
  const sync = useCallback(async (): Promise<MergeResult<LocalTodoList> | null> => {
    if (state.isSyncing) {
      console.warn("[useSync] Sync already in progress");
      return null;
    }

    return fullSync();
  }, [state.isSyncing]);

  // Clear conflicts (after user acknowledges)
  const clearConflicts = useCallback(() => {
    setState((prev) => ({ ...prev, conflicts: [] }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    sync,
    clearConflicts,
    clearError,
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  };
}

/**
 * Lightweight hook that just tracks sync status
 */
export function useSyncStatus() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasConflicts, setHasConflicts] = useState(false);

  useEffect(() => {
    const unsubscribe = addSyncListener((event) => {
      if (event.type === "start") {
        setIsSyncing(true);
      } else if (event.type === "complete" || event.type === "error") {
        setIsSyncing(false);
      } else if (event.type === "conflict") {
        setHasConflicts(true);
      }
    });

    return unsubscribe;
  }, []);

  return { isSyncing, hasConflicts };
}
