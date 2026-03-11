/**
 * Web Worker for heavy database operations
 * Offloads CPU-intensive tasks from the main thread for better performance
 * on older devices
 */

import Dexie, { type Table } from "dexie";
import type { LocalTodoList, LocalCategory, SyncQueueEntry, LocalUserProfile } from "../db/database";

// Recreate database connection in worker context
class WorkerDB extends Dexie {
  lists!: Table<LocalTodoList, number>;
  categories!: Table<LocalCategory, number>;
  syncQueue!: Table<SyncQueueEntry, number>;
  userProfile!: Table<LocalUserProfile, number>;

  constructor() {
    super("TodoAppOfflineDB");

    this.version(3).stores({
      lists: "id, name, is_archived, _syncStatus, _localUpdatedAt",
      categories: "id, name, _syncStatus",
      syncQueue: "++id, action, timestamp",
      userProfile: "id",
    });
  }
}

const db = new WorkerDB();

// Message types
type WorkerMessageType =
  | "BULK_SAVE_LISTS"
  | "SEARCH_LISTS"
  | "MERGE_LISTS"
  | "GET_PAGINATED_LISTS"
  | "EXPORT_DATA"
  | "IMPORT_DATA";

interface WorkerMessage {
  id: string;
  type: WorkerMessageType;
  payload: unknown;
}

interface WorkerResponse {
  id: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data;

  try {
    let result: unknown;

    switch (type) {
      case "BULK_SAVE_LISTS":
        result = await bulkSaveLists(payload as LocalTodoList[]);
        break;

      case "SEARCH_LISTS":
        result = await searchLists(payload as { query: string; limit?: number });
        break;

      case "MERGE_LISTS":
        result = await mergeLists(payload as { serverLists: LocalTodoList[] });
        break;

      case "GET_PAGINATED_LISTS":
        result = await getPaginatedLists(
          payload as { page: number; pageSize: number; filters?: Record<string, unknown> }
        );
        break;

      case "EXPORT_DATA":
        result = await exportAllData();
        break;

      case "IMPORT_DATA":
        result = await importData(payload as { lists: LocalTodoList[]; categories: LocalCategory[] });
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    const response: WorkerResponse = { id, success: true, data: result };
    self.postMessage(response);
  } catch (error) {
    const response: WorkerResponse = {
      id,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
    self.postMessage(response);
  }
};

// --- Worker Operations ---

async function bulkSaveLists(lists: LocalTodoList[]): Promise<{ saved: number }> {
  await db.transaction("rw", db.lists, async () => {
    // Use bulkPut for efficient batch insert/update
    await db.lists.bulkPut(
      lists.map((list) => ({
        ...list,
        _syncStatus: list._syncStatus || "synced",
        _serverUpdatedAt: Date.now(),
      }))
    );
  });

  return { saved: lists.length };
}

async function searchLists(params: {
  query: string;
  limit?: number;
}): Promise<LocalTodoList[]> {
  const { query, limit = 50 } = params;
  const lowerQuery = query.toLowerCase();

  // Get all lists and filter in worker (avoids blocking main thread)
  const allLists = await db.lists.toArray();

  const results = allLists.filter((list) => {
    // Search in list name
    if (list.name.toLowerCase().includes(lowerQuery)) return true;

    // Search in todos
    if (list.todos?.some((todo) => todo.title.toLowerCase().includes(lowerQuery))) {
      return true;
    }

    // Search in category name
    if (list.category?.name.toLowerCase().includes(lowerQuery)) return true;

    return false;
  });

  // Sort by relevance (exact matches first)
  results.sort((a, b) => {
    const aExact = a.name.toLowerCase() === lowerQuery;
    const bExact = b.name.toLowerCase() === lowerQuery;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    return 0;
  });

  return results.slice(0, limit);
}

async function mergeLists(params: {
  serverLists: LocalTodoList[];
}): Promise<{
  merged: LocalTodoList[];
  conflicts: Array<{ localId: number; serverId: number }>;
}> {
  const { serverLists } = params;
  const localLists = await db.lists.toArray();

  const localMap = new Map(localLists.map((l) => [l.id, l]));
  const serverMap = new Map(serverLists.map((l) => [l.id, l]));

  const merged: LocalTodoList[] = [];
  const conflicts: Array<{ localId: number; serverId: number }> = [];

  // Process all server lists
  for (const serverList of serverLists) {
    const localList = localMap.get(serverList.id);

    if (!localList) {
      // New from server
      merged.push({ ...serverList, _syncStatus: "synced" });
    } else if (localList._syncStatus === "dirty") {
      // Conflict detected
      conflicts.push({ localId: localList.id, serverId: serverList.id });
      // Server wins by default
      merged.push({ ...serverList, _syncStatus: "synced" });
    } else {
      // Use server version
      merged.push({ ...serverList, _syncStatus: "synced" });
    }
  }

  // Add local-only dirty lists (created offline)
  for (const localList of localLists) {
    if (!serverMap.has(localList.id) && localList._syncStatus === "dirty") {
      merged.push(localList);
    }
  }

  // Save merged results
  await db.transaction("rw", db.lists, async () => {
    await db.lists.clear();
    await db.lists.bulkPut(merged);
  });

  return { merged, conflicts };
}

async function getPaginatedLists(params: {
  page: number;
  pageSize: number;
  filters?: Record<string, unknown>;
}): Promise<{
  data: LocalTodoList[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}> {
  const { page, pageSize, filters } = params;

  let allLists = await db.lists.toArray();

  // Apply filters
  if (filters) {
    if (typeof filters.isArchived === "boolean") {
      allLists = allLists.filter((l) => l.is_archived === filters.isArchived);
    }
    if (typeof filters.categoryId === "number") {
      allLists = allLists.filter((l) => l.category?.id === filters.categoryId);
    }
    if (typeof filters.searchQuery === "string" && filters.searchQuery) {
      const query = (filters.searchQuery as string).toLowerCase();
      allLists = allLists.filter(
        (l) =>
          l.name.toLowerCase().includes(query) ||
          l.todos?.some((t) => t.title.toLowerCase().includes(query))
      );
    }
  }

  const total = allLists.length;
  const offset = (page - 1) * pageSize;
  const data = allLists.slice(offset, offset + pageSize);

  return {
    data,
    total,
    page,
    pageSize,
    hasMore: offset + pageSize < total,
  };
}

async function exportAllData(): Promise<{
  lists: LocalTodoList[];
  categories: LocalCategory[];
  exportedAt: string;
}> {
  const [lists, categories] = await Promise.all([
    db.lists.toArray(),
    db.categories.toArray(),
  ]);

  return {
    lists,
    categories,
    exportedAt: new Date().toISOString(),
  };
}

async function importData(params: {
  lists: LocalTodoList[];
  categories: LocalCategory[];
}): Promise<{ imported: { lists: number; categories: number } }> {
  const { lists, categories } = params;

  await db.transaction("rw", [db.lists, db.categories], async () => {
    if (lists.length > 0) {
      await db.lists.bulkPut(lists);
    }
    if (categories.length > 0) {
      await db.categories.bulkPut(categories);
    }
  });

  return {
    imported: {
      lists: lists.length,
      categories: categories.length,
    },
  };
}

export {};
