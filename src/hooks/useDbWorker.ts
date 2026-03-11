import { useCallback, useEffect, useRef, useState } from "react";
import type { LocalTodoList, LocalCategory, PaginatedResult } from "../db/database";

type WorkerMessageType =
  | "BULK_SAVE_LISTS"
  | "SEARCH_LISTS"
  | "MERGE_LISTS"
  | "GET_PAGINATED_LISTS"
  | "EXPORT_DATA"
  | "IMPORT_DATA";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

/**
 * Hook to interact with the database Web Worker
 * Falls back to main thread operations if Web Workers are not supported
 */
export function useDbWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRequests = useRef<Map<string, PendingRequest>>(new Map());
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [workerSupported, setWorkerSupported] = useState(true);

  useEffect(() => {
    // Check if Web Workers are supported
    if (typeof Worker === "undefined") {
      console.warn("[DbWorker] Web Workers not supported, using main thread");
      setWorkerSupported(false);
      setIsWorkerReady(true);
      return;
    }

    try {
      // Create worker
      workerRef.current = new Worker(
        new URL("../workers/dbWorker.ts", import.meta.url),
        { type: "module" }
      );

      workerRef.current.onmessage = (event) => {
        const { id, success, data, error } = event.data;
        const pending = pendingRequests.current.get(id);

        if (pending) {
          if (success) {
            pending.resolve(data);
          } else {
            pending.reject(new Error(error || "Worker error"));
          }
          pendingRequests.current.delete(id);
        }
      };

      workerRef.current.onerror = (error) => {
        console.error("[DbWorker] Worker error:", error);
      };

      setIsWorkerReady(true);
    } catch (error) {
      console.warn("[DbWorker] Failed to create worker:", error);
      setWorkerSupported(false);
      setIsWorkerReady(true);
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const sendMessage = useCallback(
    <T>(type: WorkerMessageType, payload: unknown): Promise<T> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current || !workerSupported) {
          // Fallback: reject with a message to use main thread
          reject(new Error("Worker not available"));
          return;
        }

        const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        pendingRequests.current.set(id, {
          resolve: resolve as (value: unknown) => void,
          reject,
        });

        workerRef.current.postMessage({ id, type, payload });

        // Timeout after 30 seconds
        setTimeout(() => {
          if (pendingRequests.current.has(id)) {
            pendingRequests.current.delete(id);
            reject(new Error("Worker request timeout"));
          }
        }, 30000);
      });
    },
    [workerSupported]
  );

  // --- Public API ---

  const bulkSaveLists = useCallback(
    async (lists: LocalTodoList[]): Promise<{ saved: number }> => {
      try {
        return await sendMessage<{ saved: number }>("BULK_SAVE_LISTS", lists);
      } catch {
        // Fallback to main thread
        const { saveListsToLocal } = await import("../db/database");
        await saveListsToLocal(lists);
        return { saved: lists.length };
      }
    },
    [sendMessage]
  );

  const searchLists = useCallback(
    async (query: string, limit?: number): Promise<LocalTodoList[]> => {
      try {
        return await sendMessage<LocalTodoList[]>("SEARCH_LISTS", { query, limit });
      } catch {
        // Fallback to main thread
        const { getLocalLists } = await import("../db/database");
        const lists = await getLocalLists();
        const lowerQuery = query.toLowerCase();
        return lists
          .filter(
            (l) =>
              l.name.toLowerCase().includes(lowerQuery) ||
              l.todos?.some((t) => t.title.toLowerCase().includes(lowerQuery))
          )
          .slice(0, limit || 50);
      }
    },
    [sendMessage]
  );

  const getPaginatedLists = useCallback(
    async (
      page: number,
      pageSize: number,
      filters?: { isArchived?: boolean; categoryId?: number; searchQuery?: string }
    ): Promise<PaginatedResult<LocalTodoList>> => {
      try {
        return await sendMessage<PaginatedResult<LocalTodoList>>("GET_PAGINATED_LISTS", {
          page,
          pageSize,
          filters,
        });
      } catch {
        // Fallback to main thread
        const { getLocalListsPaginated } = await import("../db/database");
        return getLocalListsPaginated(page, pageSize, filters);
      }
    },
    [sendMessage]
  );

  const exportData = useCallback(async (): Promise<{
    lists: LocalTodoList[];
    categories: LocalCategory[];
    exportedAt: string;
  }> => {
    try {
      return await sendMessage("EXPORT_DATA", {});
    } catch {
      // Fallback to main thread
      const { getLocalLists, getLocalCategories } = await import("../db/database");
      const [lists, categories] = await Promise.all([
        getLocalLists(),
        getLocalCategories(),
      ]);
      return { lists, categories, exportedAt: new Date().toISOString() };
    }
  }, [sendMessage]);

  const importData = useCallback(
    async (data: {
      lists: LocalTodoList[];
      categories: LocalCategory[];
    }): Promise<{ imported: { lists: number; categories: number } }> => {
      try {
        return await sendMessage("IMPORT_DATA", data);
      } catch {
        // Fallback to main thread
        const { saveListsToLocal, saveCategoriesToLocal } = await import("../db/database");
        await Promise.all([
          saveListsToLocal(data.lists),
          saveCategoriesToLocal(data.categories),
        ]);
        return {
          imported: { lists: data.lists.length, categories: data.categories.length },
        };
      }
    },
    [sendMessage]
  );

  return {
    isReady: isWorkerReady,
    isWorkerSupported: workerSupported,
    bulkSaveLists,
    searchLists,
    getPaginatedLists,
    exportData,
    importData,
  };
}

/**
 * Singleton instance for non-hook usage
 */
let workerInstance: Worker | null = null;
const instancePending: Map<string, PendingRequest> = new Map();

export function getDbWorker(): Worker | null {
  if (typeof Worker === "undefined") return null;

  if (!workerInstance) {
    try {
      workerInstance = new Worker(
        new URL("../workers/dbWorker.ts", import.meta.url),
        { type: "module" }
      );

      workerInstance.onmessage = (event) => {
        const { id, success, data, error } = event.data;
        const pending = instancePending.get(id);

        if (pending) {
          if (success) {
            pending.resolve(data);
          } else {
            pending.reject(new Error(error || "Worker error"));
          }
          instancePending.delete(id);
        }
      };
    } catch {
      return null;
    }
  }

  return workerInstance;
}

export async function workerSearchLists(
  query: string,
  limit?: number
): Promise<LocalTodoList[] | null> {
  const worker = getDbWorker();
  if (!worker) return null;

  return new Promise((resolve, reject) => {
    const id = `SEARCH_LISTS-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    instancePending.set(id, {
      resolve: resolve as (value: unknown) => void,
      reject,
    });

    worker.postMessage({ id, type: "SEARCH_LISTS", payload: { query, limit } });

    setTimeout(() => {
      if (instancePending.has(id)) {
        instancePending.delete(id);
        resolve(null); // Return null on timeout, let caller fallback
      }
    }, 5000);
  });
}
