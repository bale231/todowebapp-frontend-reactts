import Dexie, { type Table } from "dexie";

// --- Tipi per IndexedDB (mirror dei tipi API) ---

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

  constructor() {
    super("TodoAppOfflineDB");

    this.version(1).stores({
      lists: "id, name, is_archived",
      categories: "id, name",
      syncQueue: "++id, action, timestamp",
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

export async function clearAllLocalData(): Promise<void> {
  await db.lists.clear();
  await db.categories.clear();
  await db.syncQueue.clear();
}
