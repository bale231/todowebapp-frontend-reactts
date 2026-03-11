import { useEffect, useRef, useCallback } from "react";
import {
  fullSync,
  enableAutoSync,
  disableAutoSync,
  processSyncQueue,
} from "../services/syncService";

// Sync every 30 seconds to ensure changes propagate between devices
const SYNC_INTERVAL_MS = 30000;

// Process queue more frequently (every 10 seconds) to push pending changes
const QUEUE_PROCESS_INTERVAL_MS = 10000;

/**
 * SyncManager component - handles automatic background synchronization.
 *
 * This component ensures:
 * 1. Sync happens when coming back online (enableAutoSync)
 * 2. Periodic full sync to pull changes from other devices
 * 3. Frequent queue processing to push pending local changes
 *
 * Mount this once at app root level.
 */
export default function SyncManager() {
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSyncingRef = useRef(false);

  // Safe sync wrapper that prevents concurrent syncs
  const doSync = useCallback(async () => {
    if (isSyncingRef.current || !navigator.onLine) return;

    isSyncingRef.current = true;
    try {
      await fullSync();
    } catch (error) {
      console.error("[SyncManager] Sync failed:", error);
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  // Process pending queue entries
  const processQueue = useCallback(async () => {
    if (!navigator.onLine) return;

    try {
      const remaining = await processSyncQueue();
      if (remaining > 0) {
        console.log(`[SyncManager] ${remaining} items still in queue`);
      }
    } catch (error) {
      console.error("[SyncManager] Queue processing failed:", error);
    }
  }, []);

  useEffect(() => {
    // Enable auto-sync when coming back online
    enableAutoSync();

    // Initial sync on mount (with small delay to ensure app is ready)
    const initialSyncTimeout = setTimeout(() => {
      if (navigator.onLine) {
        doSync();
      }
    }, 2000);

    // Periodic full sync to pull changes from other devices
    syncIntervalRef.current = setInterval(() => {
      if (navigator.onLine && !isSyncingRef.current) {
        doSync();
      }
    }, SYNC_INTERVAL_MS);

    // More frequent queue processing to push pending changes
    queueIntervalRef.current = setInterval(() => {
      if (navigator.onLine && !isSyncingRef.current) {
        processQueue();
      }
    }, QUEUE_PROCESS_INTERVAL_MS);

    // Handle visibility change - sync when app becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        // Sync when user returns to app
        doSync();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      clearTimeout(initialSyncTimeout);
      disableAutoSync();

      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (queueIntervalRef.current) {
        clearInterval(queueIntervalRef.current);
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [doSync, processQueue]);

  // This component doesn't render anything visible
  return null;
}
