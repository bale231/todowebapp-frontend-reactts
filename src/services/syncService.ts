import {
  getSyncQueue,
  removeSyncQueueEntry,
  addToSyncQueue,
  getDirtyLists,
  getPendingDeleteLists,
  markListSynced,
  mergeListsFromServer,
  type SyncQueueEntry,
  type LocalTodoList,
  type MergeResult,
} from "../db/database";
import { getAuthHeaders } from "../api/todos";

const MAX_RETRIES = 5;
const API_URL = "https://bale231.pythonanywhere.com/api";

// --- Sync Event System ---

type SyncEventType = "start" | "complete" | "error" | "conflict" | "progress";

interface SyncEvent {
  type: SyncEventType;
  message?: string;
  conflicts?: Array<{ local: LocalTodoList; server: LocalTodoList }>;
  progress?: { current: number; total: number };
}

type SyncEventListener = (event: SyncEvent) => void;

const syncListeners: Set<SyncEventListener> = new Set();

export function addSyncListener(listener: SyncEventListener): () => void {
  syncListeners.add(listener);
  return () => syncListeners.delete(listener);
}

function emitSyncEvent(event: SyncEvent): void {
  syncListeners.forEach((listener) => listener(event));
}

// --- Main Sync Functions ---

/**
 * Full sync: push local changes, then pull server changes with merge
 */
export async function fullSync(): Promise<MergeResult<LocalTodoList> | null> {
  if (!navigator.onLine) {
    emitSyncEvent({ type: "error", message: "Offline - sync skipped" });
    return null;
  }

  emitSyncEvent({ type: "start", message: "Starting sync..." });

  try {
    // Step 1: Process pending deletions first
    await syncPendingDeletions();

    // Step 2: Push dirty lists to server
    await syncDirtyLists();

    // Step 3: Process any queued mutations (legacy support)
    await processSyncQueue();

    // Step 4: Pull from server and merge
    const serverLists = await fetchServerLists();
    if (!serverLists) {
      emitSyncEvent({ type: "error", message: "Failed to fetch server data" });
      return null;
    }

    const mergeResult = await mergeListsFromServer(serverLists);

    // Notify about conflicts if any
    if (mergeResult.conflicts.length > 0) {
      emitSyncEvent({
        type: "conflict",
        message: `${mergeResult.conflicts.length} conflict(s) resolved (server wins)`,
        conflicts: mergeResult.conflicts,
      });
    }

    emitSyncEvent({ type: "complete", message: "Sync completed successfully" });
    return mergeResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    emitSyncEvent({ type: "error", message: `Sync failed: ${message}` });
    throw error;
  }
}

/**
 * Fetch all lists from server
 */
async function fetchServerLists(): Promise<LocalTodoList[] | null> {
  try {
    const response = await fetch(`${API_URL}/lists/`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      console.error("[Sync] Failed to fetch lists:", response.status);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("[Sync] Network error fetching lists:", error);
    return null;
  }
}

/**
 * Push dirty (locally modified) lists to server
 */
async function syncDirtyLists(): Promise<void> {
  const dirtyLists = await getDirtyLists();

  if (dirtyLists.length === 0) return;

  emitSyncEvent({
    type: "progress",
    progress: { current: 0, total: dirtyLists.length },
  });

  for (let i = 0; i < dirtyLists.length; i++) {
    const list = dirtyLists[i];

    try {
      // Check if this is a new list (negative ID = created offline)
      if (list.id < 0) {
        await createListOnServer(list);
      } else {
        await updateListOnServer(list);
      }

      await markListSynced(list.id);
    } catch (error) {
      console.error(`[Sync] Failed to sync list ${list.id}:`, error);
      // Keep as dirty, will retry next sync
    }

    emitSyncEvent({
      type: "progress",
      progress: { current: i + 1, total: dirtyLists.length },
    });
  }
}

/**
 * Process lists marked for deletion
 */
async function syncPendingDeletions(): Promise<void> {
  const pendingDelete = await getPendingDeleteLists();

  for (const list of pendingDelete) {
    try {
      const response = await fetch(`${API_URL}/lists/${list.id}/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.ok || response.status === 404) {
        // Successfully deleted or already gone
        // The list will be removed during merge since server won't have it
      }
    } catch (error) {
      console.error(`[Sync] Failed to delete list ${list.id}:`, error);
    }
  }
}

/**
 * Create a new list on server (for lists created offline)
 */
async function createListOnServer(list: LocalTodoList): Promise<void> {
  const response = await fetch(`${API_URL}/lists/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      name: list.name,
      color: list.color,
      category: list.category?.id || null,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create list: ${response.status}`);
  }

  // Server will assign a real ID, we'll get it on next fetch
}

/**
 * Update an existing list on server
 */
async function updateListOnServer(list: LocalTodoList): Promise<void> {
  const response = await fetch(`${API_URL}/lists/${list.id}/`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      name: list.name,
      color: list.color,
      category: list.category?.id || null,
    }),
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to update list: ${response.status}`);
  }
}

// --- Legacy Sync Queue Processing ---

/**
 * Process all pending sync queue entries.
 * Returns the number of remaining (failed) entries.
 */
export async function processSyncQueue(): Promise<number> {
  if (!navigator.onLine) return -1;

  const queue = await getSyncQueue();
  let remaining = 0;

  for (const entry of queue) {
    try {
      const response = await fetch(entry.endpoint, {
        method: entry.method,
        headers: entry.headers || { "Content-Type": "application/json" },
        body: entry.body || undefined,
      });

      if (response.ok || response.status === 404) {
        // Success or resource no longer exists (already deleted server-side)
        await removeSyncQueueEntry(entry.id!);
      } else if (response.status >= 500) {
        // Server error: retry later
        remaining++;
        await handleRetry(entry);
      } else {
        // Client error (4xx): remove from queue, can't fix by retrying
        console.warn(
          `[SyncQueue] Removing entry ${entry.id} - client error ${response.status}`
        );
        await removeSyncQueueEntry(entry.id!);
      }
    } catch {
      // Network error: stop processing, will retry when back online
      remaining++;
      break;
    }
  }

  return remaining;
}

async function handleRetry(entry: SyncQueueEntry): Promise<void> {
  if (entry.retries >= MAX_RETRIES) {
    console.warn(
      `[SyncQueue] Max retries reached for entry ${entry.id}, removing`
    );
    await removeSyncQueueEntry(entry.id!);
    return;
  }

  // Update retry count
  await removeSyncQueueEntry(entry.id!);
  await addToSyncQueue({
    action: entry.action,
    endpoint: entry.endpoint,
    method: entry.method,
    body: entry.body,
    headers: entry.headers,
    timestamp: entry.timestamp,
    retries: entry.retries + 1,
  });
}

/**
 * Queue a mutation for later sync when back online.
 */
export async function queueMutation(
  action: string,
  endpoint: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
  headers?: Record<string, string>
): Promise<void> {
  await addToSyncQueue({
    action,
    endpoint,
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers,
    timestamp: Date.now(),
    retries: 0,
  });
}

// --- Auto-sync on reconnection ---

let autoSyncEnabled = false;

export function enableAutoSync(): void {
  if (autoSyncEnabled) return;
  autoSyncEnabled = true;

  window.addEventListener("online", handleOnline);
}

export function disableAutoSync(): void {
  autoSyncEnabled = false;
  window.removeEventListener("online", handleOnline);
}

async function handleOnline(): Promise<void> {
  console.log("[Sync] Back online, starting auto-sync...");
  // Small delay to ensure connection is stable
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await fullSync();
}
