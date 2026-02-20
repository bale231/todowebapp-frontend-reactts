/**
 * Offline-First Service Layer
 *
 * Strategy:
 * - READ:  Return local data immediately, then fetch from API and update local DB in background
 * - WRITE: If online, send to API + update local DB. If offline, update local DB + queue sync.
 */

import {
  db,
  saveListsToLocal,
  getLocalLists,
  saveListToLocal,
  getLocalList,
  deleteLocalList,
  saveCategoriesToLocal,
  getLocalCategories,
  addToSyncQueue,
  saveUserProfile,
  getLocalUserProfile,
  type LocalTodoList,
  type LocalCategory,
  type LocalUserProfile,
} from "../db/database";
import { getAuthHeaders } from "../api/todos";
import { getCurrentUserJWT } from "../api/auth";
import {
  invalidateCache,
} from "../utils/apiCache";

const API_URL = "https://bale231.pythonanywhere.com/api";

// --- Helpers ---

function authHeaders(): Record<string, string> {
  return getAuthHeaders();
}

function authHeadersNoContentType(): Record<string, string> {
  const token =
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken");
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// --- LISTS ---

export async function fetchListsOfflineFirst(): Promise<LocalTodoList[]> {
  // 1. Return local data if available
  const local = await getLocalLists();

  if (!navigator.onLine) {
    return local;
  }

  // 2. Fetch from API
  try {
    const res = await fetch(`${API_URL}/lists/`, {
      method: "GET",
      headers: authHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        await saveListsToLocal(data);
        return data;
      }
    }
  } catch {
    // Network error: return local data
  }

  return local;
}

export async function fetchListDetailsOfflineFirst(
  listId: number | string
): Promise<LocalTodoList | null> {
  const id = Number(listId);

  if (!navigator.onLine) {
    const local = await getLocalList(id);
    return local || null;
  }

  try {
    const res = await fetch(`${API_URL}/lists/${id}/`, {
      method: "GET",
      headers: authHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      await saveListToLocal(data);
      return data;
    }
  } catch {
    // fallback to local
  }

  const local = await getLocalList(id);
  return local || null;
}

export async function createListOffline(
  name: string,
  color: string,
  categoryId?: number | null
): Promise<{ success: boolean; data?: LocalTodoList }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: Record<string, any> = { name, color };
  if (categoryId !== undefined) body.category = categoryId;

  if (navigator.onLine) {
    try {
      const res = await fetch(`${API_URL}/lists/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        invalidateCache(/^lists:/);
        // Save to local DB
        await saveListToLocal(data);
        return { success: true, data };
      }
      return { success: false };
    } catch {
      // Fall through to offline handling
    }
  }

  // Offline: create with temporary negative ID
  const tempId = -Date.now();
  const tempList: LocalTodoList = {
    id: tempId,
    name,
    color,
    created_at: new Date().toISOString(),
    todos: [],
    category: categoryId
      ? ((await db.categories.get(categoryId)) ?? null)
      : null,
    is_owner: true,
    is_archived: false,
  };
  await saveListToLocal(tempList);

  await addToSyncQueue({
    action: "CREATE_LIST",
    endpoint: `${API_URL}/lists/`,
    method: "POST",
    body: JSON.stringify(body),
    headers: authHeaders(),
    timestamp: Date.now(),
    retries: 0,
  });

  return { success: true, data: tempList };
}

export async function editListOffline(
  listId: number,
  name: string,
  color: string,
  categoryId?: number | null
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: Record<string, any> = { name, color };
  if (typeof categoryId !== "undefined") body.category = categoryId;

  if (navigator.onLine) {
    try {
      const res = await fetch(`${API_URL}/lists/${listId}/`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        invalidateCache(/^lists?:/);
        const updated = await res.json();
        await saveListToLocal(updated);
        return true;
      }
      return false;
    } catch {
      // Fall through
    }
  }

  // Offline: update locally + queue
  const local = await getLocalList(listId);
  if (local) {
    local.name = name;
    local.color = color;
    if (categoryId !== undefined) {
      local.category = categoryId
        ? ((await db.categories.get(categoryId)) ?? null)
        : null;
    }
    await saveListToLocal(local);
  }

  await addToSyncQueue({
    action: "EDIT_LIST",
    endpoint: `${API_URL}/lists/${listId}/`,
    method: "PUT",
    body: JSON.stringify(body),
    headers: authHeaders(),
    timestamp: Date.now(),
    retries: 0,
  });

  return true;
}

export async function deleteListOffline(listId: number): Promise<boolean> {
  if (navigator.onLine) {
    try {
      const res = await fetch(`${API_URL}/lists/${listId}/`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok || res.status === 204) {
        invalidateCache(/^lists?:/);
        await deleteLocalList(listId);
        return true;
      }
      return false;
    } catch {
      // Fall through
    }
  }

  // Offline
  await deleteLocalList(listId);

  // Only queue sync if this wasn't a temp (offline-created) item
  if (listId > 0) {
    await addToSyncQueue({
      action: "DELETE_LIST",
      endpoint: `${API_URL}/lists/${listId}/`,
      method: "DELETE",
      headers: authHeaders(),
      timestamp: Date.now(),
      retries: 0,
    });
  }

  return true;
}

export async function archiveListOffline(
  listId: number,
  archive: boolean
): Promise<boolean> {
  const action = archive ? "archive" : "unarchive";

  if (navigator.onLine) {
    try {
      const res = await fetch(`${API_URL}/lists/${listId}/${action}/`, {
        method: "PATCH",
        headers: authHeaders(),
      });
      if (res.ok) {
        invalidateCache(/^lists?:/);
        const local = await getLocalList(listId);
        if (local) {
          local.is_archived = archive;
          await saveListToLocal(local);
        }
        return true;
      }
      return false;
    } catch {
      // Fall through
    }
  }

  // Offline
  const local = await getLocalList(listId);
  if (local) {
    local.is_archived = archive;
    await saveListToLocal(local);
  }

  await addToSyncQueue({
    action: archive ? "ARCHIVE_LIST" : "UNARCHIVE_LIST",
    endpoint: `${API_URL}/lists/${listId}/${action}/`,
    method: "PATCH",
    headers: authHeaders(),
    timestamp: Date.now(),
    retries: 0,
  });

  return true;
}

// --- TODOS ---

export async function createTodoOffline(
  listId: number | string,
  title: string,
  quantity?: number | null,
  unit?: string | null
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: Record<string, any> = { title };
  if (quantity !== undefined && quantity !== null) body.quantity = quantity;
  if (unit !== undefined && unit !== null) body.unit = unit;

  if (navigator.onLine) {
    try {
      const res = await fetch(`${API_URL}/lists/${listId}/todos/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        invalidateCache(/^lists?:/);
        return true;
      }
      return false;
    } catch {
      // Fall through
    }
  }

  // Offline: add todo locally
  const local = await getLocalList(Number(listId));
  if (local) {
    const tempTodo = {
      id: -Date.now(),
      title,
      completed: false,
      quantity: quantity ?? null,
      unit: unit ?? null,
    };
    local.todos = [...local.todos, tempTodo];
    await saveListToLocal(local);
  }

  await addToSyncQueue({
    action: "CREATE_TODO",
    endpoint: `${API_URL}/lists/${listId}/todos/`,
    method: "POST",
    body: JSON.stringify(body),
    headers: authHeaders(),
    timestamp: Date.now(),
    retries: 0,
  });

  return true;
}

export async function toggleTodoOffline(todoId: number): Promise<boolean> {
  if (navigator.onLine) {
    try {
      const res = await fetch(`${API_URL}/todos/${todoId}/toggle/`, {
        method: "PATCH",
        headers: authHeaders(),
      });
      if (res.ok) {
        invalidateCache(/^lists?:/);
        return true;
      }
      return false;
    } catch {
      // Fall through
    }
  }

  // Offline: toggle locally
  const allLists = await getLocalLists();
  for (const list of allLists) {
    const todo = list.todos.find((t) => t.id === todoId);
    if (todo) {
      todo.completed = !todo.completed;
      await saveListToLocal(list);
      break;
    }
  }

  await addToSyncQueue({
    action: "TOGGLE_TODO",
    endpoint: `${API_URL}/todos/${todoId}/toggle/`,
    method: "PATCH",
    headers: authHeaders(),
    timestamp: Date.now(),
    retries: 0,
  });

  return true;
}

export async function deleteTodoOffline(todoId: number): Promise<boolean> {
  if (navigator.onLine) {
    try {
      const res = await fetch(`${API_URL}/todos/${todoId}/`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok || res.status === 204) {
        invalidateCache(/^lists?:/);
        return true;
      }
      return false;
    } catch {
      // Fall through
    }
  }

  // Offline: remove locally
  const allLists = await getLocalLists();
  for (const list of allLists) {
    const idx = list.todos.findIndex((t) => t.id === todoId);
    if (idx !== -1) {
      list.todos.splice(idx, 1);
      await saveListToLocal(list);
      break;
    }
  }

  if (todoId > 0) {
    await addToSyncQueue({
      action: "DELETE_TODO",
      endpoint: `${API_URL}/todos/${todoId}/`,
      method: "DELETE",
      headers: authHeaders(),
      timestamp: Date.now(),
      retries: 0,
    });
  }

  return true;
}

export async function updateTodoOffline(
  todoId: number,
  title: string,
  quantity?: number | null,
  unit?: string | null
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: Record<string, any> = { title };
  if (quantity !== undefined) body.quantity = quantity;
  if (unit !== undefined) body.unit = unit;

  if (navigator.onLine) {
    try {
      const res = await fetch(`${API_URL}/todos/${todoId}/update/`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        invalidateCache(/^lists?:/);
        return true;
      }
      return false;
    } catch {
      // Fall through
    }
  }

  // Offline: update locally
  const allLists = await getLocalLists();
  for (const list of allLists) {
    const todo = list.todos.find((t) => t.id === todoId);
    if (todo) {
      todo.title = title;
      if (quantity !== undefined) todo.quantity = quantity;
      if (unit !== undefined) todo.unit = unit;
      await saveListToLocal(list);
      break;
    }
  }

  await addToSyncQueue({
    action: "UPDATE_TODO",
    endpoint: `${API_URL}/todos/${todoId}/update/`,
    method: "PATCH",
    body: JSON.stringify(body),
    headers: authHeaders(),
    timestamp: Date.now(),
    retries: 0,
  });

  return true;
}

// --- CATEGORIES ---

export async function fetchCategoriesOfflineFirst(): Promise<LocalCategory[]> {
  const local = await getLocalCategories();

  if (!navigator.onLine) {
    return local;
  }

  try {
    const token =
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("accessToken") ||
      "";
    const res = await fetch(`${API_URL}/categories/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        await saveCategoriesToLocal(data);
        return data;
      }
    }
  } catch {
    // fallback to local
  }

  return local;
}

export async function createCategoryOffline(
  name: string
): Promise<boolean> {
  if (navigator.onLine) {
    try {
      const token =
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("accessToken") ||
        "";
      const res = await fetch(`${API_URL}/categories/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        invalidateCache(/^categories:/);
        return true;
      }
      return false;
    } catch {
      // Fall through
    }
  }

  // Offline
  const tempCat: LocalCategory = {
    id: -Date.now(),
    name,
    is_owner: true,
  };
  const cats = await getLocalCategories();
  await saveCategoriesToLocal([...cats, tempCat]);

  const token =
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken") ||
    "";
  await addToSyncQueue({
    action: "CREATE_CATEGORY",
    endpoint: `${API_URL}/categories/`,
    method: "POST",
    body: JSON.stringify({ name }),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    timestamp: Date.now(),
    retries: 0,
  });

  return true;
}

export async function editCategoryOffline(
  categoryId: number,
  name: string
): Promise<boolean> {
  if (navigator.onLine) {
    try {
      const token =
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("accessToken") ||
        "";
      const res = await fetch(`${API_URL}/categories/${categoryId}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        invalidateCache(/^categories:/);
        const cats = await getLocalCategories();
        const cat = cats.find((c) => c.id === categoryId);
        if (cat) {
          cat.name = name;
          await saveCategoriesToLocal(cats);
        }
        return true;
      }
      return false;
    } catch {
      // Fall through
    }
  }

  // Offline
  const cats = await getLocalCategories();
  const cat = cats.find((c) => c.id === categoryId);
  if (cat) {
    cat.name = name;
    await saveCategoriesToLocal(cats);
  }

  const token =
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken") ||
    "";
  await addToSyncQueue({
    action: "EDIT_CATEGORY",
    endpoint: `${API_URL}/categories/${categoryId}/`,
    method: "PATCH",
    body: JSON.stringify({ name }),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    timestamp: Date.now(),
    retries: 0,
  });

  return true;
}

// --- USER PROFILE ---

/**
 * Get current user with offline fallback.
 * - Online: fetches from API, saves to IndexedDB, returns user
 * - Offline: returns cached user from IndexedDB (if previously logged in)
 * - No token & no cached user: returns null (user must login)
 */
export async function getCurrentUserOfflineFirst(): Promise<LocalUserProfile | null> {
  const token =
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken");

  if (!token) {
    // No token at all - user never logged in on this device
    return null;
  }

  if (navigator.onLine) {
    try {
      const user = await getCurrentUserJWT();
      if (user) {
        // Save to IndexedDB for offline use
        await saveUserProfile(user);
        return user;
      }
    } catch {
      // Network error - fall through to local
    }
  }

  // Offline or API failed: return cached profile
  const cached = await getLocalUserProfile();
  return cached || null;
}

// Re-export auth headers for components that need them
export { authHeaders, authHeadersNoContentType };
