import Dexie, { type Table } from "dexie";

// --- Tipi per IndexedDB (mirror dei tipi API) ---

// Sync status for conflict resolution
export type SyncStatus = "synced" | "dirty" | "conflict" | "pending_delete";

export interface LocalTodoList {
  id: number;
  name: string;
  color: string;
  created_at: string;
  todos: LocalTodo[];
  category?: LocalCategory | null;
  is_owner?: boolean;
  is_shared?: boolean;
  is_archived?: boolean;
  can_edit?: boolean;
  shared_by?: {
    id: number;
    username: string;
    full_name: string;
  } | null;
  // Campo per la sort_order della lista
  sort_order?: string;
  // Sync metadata
  _syncStatus?: SyncStatus;
  _localUpdatedAt?: number;
  _serverUpdatedAt?: number;
  _localVersion?: number;
}

export interface LocalTodo {
  id: number;
  title: string;
  completed: boolean;
  quantity?: number | null;
  unit?: string | null;
  created_by?: {
    id: number;
    username: string;
    full_name: string;
  } | null;
  modified_by?: {
    id: number;
    username: string;
    full_name: string;
  } | null;
  // Sync metadata
  _syncStatus?: SyncStatus;
  _localUpdatedAt?: number;
}

export interface LocalCategory {
  id: number;
  name: string;
  is_owner?: boolean;
  is_shared?: boolean;
  can_edit?: boolean;
  shared_by?: {
    id: number;
    username: string;
    full_name: string;
  } | null;
  // Sync metadata
  _syncStatus?: SyncStatus;
  _localUpdatedAt?: number;
}

export interface LocalUserProfile {
  id: number;
  username: string;
  email: string;
  profile_picture: string | null;
  push_notifications_enabled?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface SyncQueueEntry {
  id?: number;
  action: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: string;
  headers?: Record<string, string>;
  timestamp: number;
  retries: number;
}

// --- Database Dexie ---

class TodoAppDB extends Dexie {
  lists!: Table<LocalTodoList, number>;
  categories!: Table<LocalCategory, number>;
  syncQueue!: Table<SyncQueueEntry, number>;
  userProfile!: Table<LocalUserProfile, number>;

  constructor() {
    super("TodoAppOfflineDB");

    // Version 2 - original schema
    this.version(2).stores({
      lists: "id, name, is_archived",
      categories: "id, name",
      syncQueue: "++id, action, timestamp",
      userProfile: "id",
    });

    // Version 3 - add sync status index for conflict resolution
    this.version(3).stores({
      lists: "id, name, is_archived, _syncStatus, _localUpdatedAt",
      categories: "id, name, _syncStatus",
      syncQueue: "++id, action, timestamp",
      userProfile: "id",
    });
  }
}

export const db = new TodoAppDB();

// --- Helper functions ---

export async function saveListsToLocal(lists: LocalTodoList[]): Promise<void> {
  await db.lists.clear();
  await db.lists.bulkPut(lists);
}

export async function getLocalLists(): Promise<LocalTodoList[]> {
  return db.lists.toArray();
}

export async function saveListToLocal(list: LocalTodoList): Promise<void> {
  await db.lists.put(list);
}

export async function getLocalList(
  listId: number
): Promise<LocalTodoList | undefined> {
  return db.lists.get(listId);
}

export async function deleteLocalList(listId: number): Promise<void> {
  await db.lists.delete(listId);
}

export async function saveCategoriesToLocal(
  categories: LocalCategory[]
): Promise<void> {
  await db.categories.clear();
  await db.categories.bulkPut(categories);
}

export async function getLocalCategories(): Promise<LocalCategory[]> {
  return db.categories.toArray();
}

export async function addToSyncQueue(
  entry: Omit<SyncQueueEntry, "id">
): Promise<void> {
  await db.syncQueue.add(entry);
}

export async function getSyncQueue(): Promise<SyncQueueEntry[]> {
  return db.syncQueue.orderBy("timestamp").toArray();
}

export async function removeSyncQueueEntry(id: number): Promise<void> {
  await db.syncQueue.delete(id);
}

export async function clearSyncQueue(): Promise<void> {
  await db.syncQueue.clear();
}

export async function saveUserProfile(user: LocalUserProfile): Promise<void> {
  await db.userProfile.put(user);
}

export async function getLocalUserProfile(): Promise<LocalUserProfile | undefined> {
  // Return the first (and only) user profile
  return db.userProfile.toCollection().first();
}

export async function clearUserProfile(): Promise<void> {
  await db.userProfile.clear();
}

export async function clearAllLocalData(): Promise<void> {
  await db.lists.clear();
  await db.categories.clear();
  await db.syncQueue.clear();
  await db.userProfile.clear();
}

// --- Merge & Conflict Resolution ---

export interface MergeResult<T> {
  merged: T[];
  conflicts: Array<{ local: T; server: T }>;
  toSync: T[];
}

/**
 * Mark a list as dirty (modified locally, needs sync)
 */
export async function markListDirty(listId: number): Promise<void> {
  await db.lists.update(listId, {
    _syncStatus: "dirty",
    _localUpdatedAt: Date.now(),
    _localVersion: ((await db.lists.get(listId))?._localVersion || 0) + 1,
  });
}

/**
 * Mark a list as synced (in sync with server)
 */
export async function markListSynced(
  listId: number,
  serverUpdatedAt?: number
): Promise<void> {
  await db.lists.update(listId, {
    _syncStatus: "synced",
    _serverUpdatedAt: serverUpdatedAt || Date.now(),
  });
}

/**
 * Get all dirty (unsynced) lists
 */
export async function getDirtyLists(): Promise<LocalTodoList[]> {
  return db.lists.where("_syncStatus").equals("dirty").toArray();
}

/**
 * Get lists pending deletion
 */
export async function getPendingDeleteLists(): Promise<LocalTodoList[]> {
  return db.lists.where("_syncStatus").equals("pending_delete").toArray();
}

/**
 * Mark a list for pending deletion (will be deleted on next sync)
 */
export async function markListPendingDelete(listId: number): Promise<void> {
  await db.lists.update(listId, {
    _syncStatus: "pending_delete",
    _localUpdatedAt: Date.now(),
  });
}

/**
 * Merge server lists with local lists, handling conflicts
 * Strategy: Last-write-wins with conflict detection
 */
export async function mergeListsFromServer(
  serverLists: LocalTodoList[]
): Promise<MergeResult<LocalTodoList>> {
  const localLists = await db.lists.toArray();
  const localMap = new Map(localLists.map((l) => [l.id, l]));
  const serverMap = new Map(serverLists.map((l) => [l.id, l]));

  const merged: LocalTodoList[] = [];
  const conflicts: Array<{ local: LocalTodoList; server: LocalTodoList }> = [];
  const toSync: LocalTodoList[] = [];

  // Process server lists
  for (const serverList of serverLists) {
    const localList = localMap.get(serverList.id);

    if (!localList) {
      // New from server - add it
      merged.push({ ...serverList, _syncStatus: "synced", _serverUpdatedAt: Date.now() });
    } else if (localList._syncStatus === "dirty") {
      // Local was modified - check for conflict
      const serverTime = serverList._serverUpdatedAt || 0;
      const localTime = localList._localUpdatedAt || 0;

      if (serverTime > localTime) {
        // Server is newer - conflict, but server wins
        conflicts.push({ local: localList, server: serverList });
        merged.push({ ...serverList, _syncStatus: "synced", _serverUpdatedAt: Date.now() });
      } else {
        // Local is newer - keep local, mark for sync
        toSync.push(localList);
        merged.push(localList);
      }
    } else if (localList._syncStatus === "pending_delete") {
      // Was marked for deletion locally - don't add to merged
      toSync.push(localList);
    } else {
      // Local is synced - use server version
      merged.push({ ...serverList, _syncStatus: "synced", _serverUpdatedAt: Date.now() });
    }
  }

  // Check for local-only lists (created offline)
  for (const localList of localLists) {
    if (!serverMap.has(localList.id)) {
      if (localList._syncStatus === "dirty" || localList.id < 0) {
        // Created locally, needs to be synced
        toSync.push(localList);
        merged.push(localList);
      }
      // If synced but not on server, it was deleted server-side - don't keep
    }
  }

  // Save merged results
  await db.transaction("rw", db.lists, async () => {
    await db.lists.clear();
    await db.lists.bulkPut(merged);
  });

  return { merged, conflicts, toSync };
}

/**
 * Save a list with optimistic update support
 * Returns a rollback function in case the server request fails
 */
export async function saveListOptimistic(
  list: LocalTodoList
): Promise<{ rollback: () => Promise<void>; previousState: LocalTodoList | undefined }> {
  const previousState = await db.lists.get(list.id);

  await db.lists.put({
    ...list,
    _syncStatus: "dirty",
    _localUpdatedAt: Date.now(),
    _localVersion: (previousState?._localVersion || 0) + 1,
  });

  return {
    previousState,
    rollback: async () => {
      if (previousState) {
        await db.lists.put(previousState);
      } else {
        await db.lists.delete(list.id);
      }
    },
  };
}

// --- Pagination & Lazy Loading ---

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Get lists with pagination (for performance on older devices)
 */
export async function getLocalListsPaginated(
  page: number = 1,
  pageSize: number = 20,
  options?: {
    isArchived?: boolean;
    categoryId?: number;
    searchQuery?: string;
  }
): Promise<PaginatedResult<LocalTodoList>> {
  let collection = db.lists.toCollection();

  // Apply filters
  if (options?.isArchived !== undefined) {
    collection = db.lists.where("is_archived").equals(options.isArchived ? 1 : 0);
  }

  // Get total count first (for pagination info)
  const allFiltered = await collection.toArray();

  // Apply search filter in memory (IndexedDB doesn't support full-text search)
  let filtered = allFiltered;
  if (options?.searchQuery) {
    const query = options.searchQuery.toLowerCase();
    filtered = allFiltered.filter(
      (list) =>
        list.name.toLowerCase().includes(query) ||
        list.todos.some((todo) => todo.title.toLowerCase().includes(query))
    );
  }

  if (options?.categoryId !== undefined) {
    filtered = filtered.filter((list) => list.category?.id === options.categoryId);
  }

  const total = filtered.length;
  const offset = (page - 1) * pageSize;
  const data = filtered.slice(offset, offset + pageSize);

  return {
    data,
    total,
    page,
    pageSize,
    hasMore: offset + pageSize < total,
  };
}

/**
 * Get only list metadata (without todos) for faster initial load
 */
export async function getLocalListsMetadata(): Promise<
  Array<Omit<LocalTodoList, "todos"> & { todoCount: number; completedCount: number }>
> {
  const lists = await db.lists.toArray();
  return lists.map((list) => ({
    ...list,
    todos: undefined as never,
    todoCount: list.todos?.length || 0,
    completedCount: list.todos?.filter((t) => t.completed).length || 0,
  }));
}

/**
 * Get a single list's todos (lazy load)
 */
export async function getLocalListTodos(listId: number): Promise<LocalTodo[]> {
  const list = await db.lists.get(listId);
  return list?.todos || [];
}
