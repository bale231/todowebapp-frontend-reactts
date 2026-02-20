import {
  getSyncQueue,
  removeSyncQueueEntry,
  addToSyncQueue,
  type SyncQueueEntry,
} from "../db/database";

const MAX_RETRIES = 5;

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
