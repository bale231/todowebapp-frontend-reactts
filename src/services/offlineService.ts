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
import { getAuthHeaders, fetchWithAuth } from "../api/todos";
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

/**
 * Fetch lists with TRUE offline-first strategy.
 * Returns local data IMMEDIATELY, then fetches from API in background.
 * Use onUpdate callback to receive fresh data when available.
 */
export async function fetchListsOfflineFirst(
  onUpdate?: (data: LocalTodoList[]) => void
): Promise<LocalTodoList[]> {
  // 1. Return local data IMMEDIATELY
  const local = await getLocalLists();

  if (!navigator.onLine) {
    return local;
  }

  // 2. Fetch from API in BACKGROUND (don't block)
  fetchWithAuth(`${API_URL}/lists/`, {
    method: "GET",
  })
    .then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Merge: preserve sort_order from dirty local lists (pending PATCH not yet confirmed)
          const existingLocal = await getLocalLists();
          const localMap = new Map(existingLocal.map(l => [l.id, l]));
          const merged = data.map((serverList: LocalTodoList) => {
            const localList = localMap.get(serverList.id);
            if (localList?._syncStatus === "dirty" && localList?.sort_order) {
              return { ...serverList, sort_order: localList.sort_order, _syncStatus: "dirty" as const, _localUpdatedAt: localList._localUpdatedAt };
            }
            return serverList;
          });
          await saveListsToLocal(merged);
          // Notify caller if callback provided
          if (onUpdate) {
            onUpdate(merged);
          }
        }
      }
    })
    .catch(() => {
      // Network error: silently ignore, we already have local data
    });

  // Return local data immediately
  return local;
}

/**
 * Fetch list details with TRUE offline-first strategy.
 * Returns local data IMMEDIATELY, then fetches from API in background.
 * Use onUpdate callback to receive fresh data when available.
 */
export async function fetchListDetailsOfflineFirst(
  listId: number | string,
  onUpdate?: (data: LocalTodoList) => void
): Promise<LocalTodoList | null> {
  const id = Number(listId);

  // 1. Return local data IMMEDIATELY
  const local = await getLocalList(id);

  if (!navigator.onLine) {
    return local || null;
  }

  // 2. Fetch from API in BACKGROUND (don't block)
  fetchWithAuth(`${API_URL}/lists/${id}/`, {
    method: "GET",
  })
    .then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        await saveListToLocal(data);
        // Notify caller if callback provided
        if (onUpdate) {
          onUpdate(data);
        }
      }
    })
    .catch(() => {
      // Network error: silently ignore, we already have local data
    });

  // Return local data immediately (may be null on first load)
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

  // OPTIMISTIC: Create with temporary negative ID FIRST
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

  if (navigator.onLine) {
    // Send to backend in BACKGROUND (don't await)
    fetchWithAuth(`${API_URL}/lists/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (res.ok) {
          invalidateCache(/^lists:/);
          const data = await res.json();
          // Replace temp list with real one
          await deleteLocalList(tempId);
          await saveListToLocal(data);
        } else {
          // API failed: queue for retry
          await addToSyncQueue({
            action: "CREATE_LIST",
            endpoint: `${API_URL}/lists/`,
            method: "POST",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
            timestamp: Date.now(),
            retries: 0,
          });
        }
      })
      .catch(async () => {
        // Network error: queue for retry
        await addToSyncQueue({
          action: "CREATE_LIST",
          endpoint: `${API_URL}/lists/`,
          method: "POST",
          body: JSON.stringify(body),
          headers: authHeaders(),
          timestamp: Date.now(),
          retries: 0,
        });
      });

    return { success: true, data: tempList };
  }

  // Offline: queue for later sync
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

  // OPTIMISTIC: Update locally FIRST
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

  if (navigator.onLine) {
    // Send to backend in BACKGROUND (don't await)
    fetchWithAuth(`${API_URL}/lists/${listId}/`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (res.ok) {
          invalidateCache(/^lists?:/);
          const updated = await res.json();
          await saveListToLocal(updated);
        } else {
          // API failed: queue for retry
          await addToSyncQueue({
            action: "EDIT_LIST",
            endpoint: `${API_URL}/lists/${listId}/`,
            method: "PUT",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
            timestamp: Date.now(),
            retries: 0,
          });
        }
      })
      .catch(async () => {
        // Network error: queue for retry
        await addToSyncQueue({
          action: "EDIT_LIST",
          endpoint: `${API_URL}/lists/${listId}/`,
          method: "PUT",
          body: JSON.stringify(body),
          headers: authHeaders(),
          timestamp: Date.now(),
          retries: 0,
        });
      });

    return true;
  }

  // Offline: queue for later sync
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
  // OPTIMISTIC: Delete locally FIRST
  await deleteLocalList(listId);

  if (navigator.onLine && listId > 0) {
    // Send to backend in BACKGROUND (don't await)
    fetchWithAuth(`${API_URL}/lists/${listId}/`, {
      method: "DELETE",
      headers: authHeaders(),
    })
      .then((res) => {
        if (res.ok || res.status === 204) {
          invalidateCache(/^lists?:/);
        } else {
          // API failed: queue for retry
          addToSyncQueue({
            action: "DELETE_LIST",
            endpoint: `${API_URL}/lists/${listId}/`,
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            timestamp: Date.now(),
            retries: 0,
          });
        }
      })
      .catch(() => {
        // Network error: queue for retry
        addToSyncQueue({
          action: "DELETE_LIST",
          endpoint: `${API_URL}/lists/${listId}/`,
          method: "DELETE",
          headers: authHeaders(),
          timestamp: Date.now(),
          retries: 0,
        });
      });

    return true;
  }

  // Offline: queue for later sync (only for real items)
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

  // OPTIMISTIC: Update locally FIRST
  const local = await getLocalList(listId);
  if (local) {
    local.is_archived = archive;
    await saveListToLocal(local);
  }

  if (navigator.onLine) {
    // Send to backend in BACKGROUND (don't await)
    fetchWithAuth(`${API_URL}/lists/${listId}/${action}/`, {
      method: "PATCH",
      headers: authHeaders(),
    })
      .then((res) => {
        if (res.ok) {
          invalidateCache(/^lists?:/);
        } else {
          // API failed: queue for retry
          addToSyncQueue({
            action: archive ? "ARCHIVE_LIST" : "UNARCHIVE_LIST",
            endpoint: `${API_URL}/lists/${listId}/${action}/`,
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            timestamp: Date.now(),
            retries: 0,
          });
        }
      })
      .catch(() => {
        // Network error: queue for retry
        addToSyncQueue({
          action: archive ? "ARCHIVE_LIST" : "UNARCHIVE_LIST",
          endpoint: `${API_URL}/lists/${listId}/${action}/`,
          method: "PATCH",
          headers: authHeaders(),
          timestamp: Date.now(),
          retries: 0,
        });
      });

    return true;
  }

  // Offline: queue for later sync
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

/**
 * Create todo with optimistic updates.
 * Updates local DB immediately, then syncs to backend in background.
 * Returns the temporary todo object for immediate UI update.
 */
export async function createTodoOffline(
  listId: number | string,
  title: string,
  quantity?: number | null,
  unit?: string | null
): Promise<{ success: boolean; tempTodo?: { id: number; title: string; completed: boolean; quantity: number | null; unit: string | null } }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: Record<string, any> = { title };
  if (quantity !== undefined && quantity !== null) body.quantity = quantity;
  if (unit !== undefined && unit !== null) body.unit = unit;

  // Create temp todo for immediate local update
  const tempTodo = {
    id: -Date.now(),
    title,
    completed: false,
    quantity: quantity ?? null,
    unit: unit ?? null,
  };

  // OPTIMISTIC: Update local DB immediately - add to START of array
  const local = await getLocalList(Number(listId));
  if (local) {
    local.todos = [tempTodo, ...local.todos];
    await saveListToLocal(local);
  }

  if (navigator.onLine) {
    // Send to backend in BACKGROUND (don't await)
    fetchWithAuth(`${API_URL}/lists/${listId}/todos/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (res.ok) {
          invalidateCache(/^lists?:/);
          // Optionally: replace temp ID with real ID from response
          const data = await res.json();
          const localList = await getLocalList(Number(listId));
          if (localList) {
            const todoIndex = localList.todos.findIndex((t) => t.id === tempTodo.id);
            if (todoIndex !== -1) {
              localList.todos[todoIndex] = { ...localList.todos[todoIndex], id: data.id };
              await saveListToLocal(localList);
            }
          }
        } else {
          // API failed: queue for retry
          await addToSyncQueue({
            action: "CREATE_TODO",
            endpoint: `${API_URL}/lists/${listId}/todos/`,
            method: "POST",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
            timestamp: Date.now(),
            retries: 0,
          });
        }
      })
      .catch(async () => {
        // Network error: queue for retry
        await addToSyncQueue({
          action: "CREATE_TODO",
          endpoint: `${API_URL}/lists/${listId}/todos/`,
          method: "POST",
          body: JSON.stringify(body),
          headers: authHeaders(),
          timestamp: Date.now(),
          retries: 0,
        });
      });

    return { success: true, tempTodo };
  }

  // Offline: queue for later sync
  await addToSyncQueue({
    action: "CREATE_TODO",
    endpoint: `${API_URL}/lists/${listId}/todos/`,
    method: "POST",
    body: JSON.stringify(body),
    headers: authHeaders(),
    timestamp: Date.now(),
    retries: 0,
  });

  return { success: true, tempTodo };
}

/**
 * Toggle todo with optimistic updates.
 * Updates local DB immediately, then syncs to backend in background.
 */
export async function toggleTodoOffline(todoId: number): Promise<boolean> {
  // OPTIMISTIC: Toggle locally FIRST
  const allLists = await getLocalLists();
  for (const list of allLists) {
    const todo = list.todos.find((t) => t.id === todoId);
    if (todo) {
      todo.completed = !todo.completed;
      await saveListToLocal(list);
      break;
    }
  }

  if (navigator.onLine) {
    // Send to backend in BACKGROUND (don't await)
    fetchWithAuth(`${API_URL}/todos/${todoId}/toggle/`, {
      method: "PATCH",
      headers: authHeaders(),
    })
      .then((res) => {
        if (res.ok) {
          invalidateCache(/^lists?:/);
        } else {
          // API failed: queue for retry
          addToSyncQueue({
            action: "TOGGLE_TODO",
            endpoint: `${API_URL}/todos/${todoId}/toggle/`,
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            timestamp: Date.now(),
            retries: 0,
          });
        }
      })
      .catch(() => {
        // Network error: queue for retry
        addToSyncQueue({
          action: "TOGGLE_TODO",
          endpoint: `${API_URL}/todos/${todoId}/toggle/`,
          method: "PATCH",
          headers: authHeaders(),
          timestamp: Date.now(),
          retries: 0,
        });
      });

    return true;
  }

  // Offline: queue for later sync
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

/**
 * Delete todo with optimistic updates.
 * Removes from local DB immediately, then syncs to backend in background.
 */
export async function deleteTodoOffline(todoId: number): Promise<boolean> {
  // OPTIMISTIC: Remove locally FIRST
  const allLists = await getLocalLists();
  for (const list of allLists) {
    const idx = list.todos.findIndex((t) => t.id === todoId);
    if (idx !== -1) {
      list.todos.splice(idx, 1);
      await saveListToLocal(list);
      break;
    }
  }

  if (navigator.onLine && todoId > 0) {
    // Send to backend in BACKGROUND (don't await)
    fetchWithAuth(`${API_URL}/todos/${todoId}/`, {
      method: "DELETE",
      headers: authHeaders(),
    })
      .then((res) => {
        if (res.ok || res.status === 204) {
          invalidateCache(/^lists?:/);
        } else {
          // API failed: queue for retry
          addToSyncQueue({
            action: "DELETE_TODO",
            endpoint: `${API_URL}/todos/${todoId}/`,
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            timestamp: Date.now(),
            retries: 0,
          });
        }
      })
      .catch(() => {
        // Network error: queue for retry
        addToSyncQueue({
          action: "DELETE_TODO",
          endpoint: `${API_URL}/todos/${todoId}/`,
          method: "DELETE",
          headers: authHeaders(),
          timestamp: Date.now(),
          retries: 0,
        });
      });

    return true;
  }

  // Offline: queue for later sync (only if it's a real todo, not temp)
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

/**
 * Update todo with optimistic updates.
 * Updates local DB immediately, then syncs to backend in background.
 */
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

  // OPTIMISTIC: Update locally FIRST
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

  if (navigator.onLine) {
    // Send to backend in BACKGROUND (don't await)
    fetchWithAuth(`${API_URL}/todos/${todoId}/update/`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (res.ok) {
          invalidateCache(/^lists?:/);
        } else {
          // API failed: queue for retry
          addToSyncQueue({
            action: "UPDATE_TODO",
            endpoint: `${API_URL}/todos/${todoId}/update/`,
            method: "PATCH",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
            timestamp: Date.now(),
            retries: 0,
          });
        }
      })
      .catch(() => {
        // Network error: queue for retry
        addToSyncQueue({
          action: "UPDATE_TODO",
          endpoint: `${API_URL}/todos/${todoId}/update/`,
          method: "PATCH",
          body: JSON.stringify(body),
          headers: authHeaders(),
          timestamp: Date.now(),
          retries: 0,
        });
      });

    return true;
  }

  // Offline: queue for later sync
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

/**
 * Fetch categories with TRUE offline-first strategy.
 * Returns local data IMMEDIATELY, then fetches from API in background.
 * Use onUpdate callback to receive fresh data when available.
 */
export async function fetchCategoriesOfflineFirst(
  onUpdate?: (data: LocalCategory[]) => void
): Promise<LocalCategory[]> {
  // 1. Return local data IMMEDIATELY
  const local = await getLocalCategories();

  if (!navigator.onLine) {
    return local;
  }

  // 2. Fetch from API in BACKGROUND (don't block)
  fetchWithAuth(`${API_URL}/categories/`, {
    headers: authHeaders(),
  })
    .then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          await saveCategoriesToLocal(data);
          // Notify caller if callback provided
          if (onUpdate) {
            onUpdate(data);
          }
        }
      }
    })
    .catch(() => {
      // Network error: silently ignore, we already have local data
    });

  // Return local data immediately
  return local;
}

export async function createCategoryOffline(
  name: string
): Promise<{ success: boolean; data?: LocalCategory }> {
  // OPTIMISTIC: Create locally FIRST
  const tempCat: LocalCategory = {
    id: -Date.now(),
    name,
    is_owner: true,
  };
  const cats = await getLocalCategories();
  await saveCategoriesToLocal([...cats, tempCat]);

  if (navigator.onLine) {
    // Send to backend in BACKGROUND (don't await)
    fetchWithAuth(`${API_URL}/categories/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name }),
    })
      .then(async (res) => {
        if (res.ok) {
          invalidateCache(/^categories:/);
          // Refresh categories from backend to get real ID
          const newCats = await res.json();
          if (newCats && newCats.id) {
            // Replace temp with real
            const currentCats = await getLocalCategories();
            const filtered = currentCats.filter((c) => c.id !== tempCat.id);
            await saveCategoriesToLocal([...filtered, newCats]);
          }
        } else {
          // API failed: queue for retry
          await addToSyncQueue({
            action: "CREATE_CATEGORY",
            endpoint: `${API_URL}/categories/`,
            method: "POST",
            body: JSON.stringify({ name }),
            headers: { "Content-Type": "application/json" },
            timestamp: Date.now(),
            retries: 0,
          });
        }
      })
      .catch(async () => {
        // Network error: queue for retry
        await addToSyncQueue({
          action: "CREATE_CATEGORY",
          endpoint: `${API_URL}/categories/`,
          method: "POST",
          body: JSON.stringify({ name }),
          headers: { "Content-Type": "application/json" },
          timestamp: Date.now(),
          retries: 0,
        });
      });

    return { success: true, data: tempCat };
  }

  return { success: true, data: tempCat };
}

export async function editCategoryOffline(
  categoryId: number,
  name: string
): Promise<boolean> {
  // OPTIMISTIC: Update locally FIRST
  const cats = await getLocalCategories();
  const cat = cats.find((c) => c.id === categoryId);
  if (cat) {
    cat.name = name;
    await saveCategoriesToLocal(cats);
  }

  if (navigator.onLine) {
    // Send to backend in BACKGROUND (don't await)
    fetchWithAuth(`${API_URL}/categories/${categoryId}/`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ name }),
    })
      .then((res) => {
        if (res.ok) {
          invalidateCache(/^categories:/);
        } else {
          // API failed: queue for retry
          addToSyncQueue({
            action: "EDIT_CATEGORY",
            endpoint: `${API_URL}/categories/${categoryId}/`,
            method: "PATCH",
            body: JSON.stringify({ name }),
            headers: { "Content-Type": "application/json" },
            timestamp: Date.now(),
            retries: 0,
          });
        }
      })
      .catch(() => {
        // Network error: queue for retry
        addToSyncQueue({
          action: "EDIT_CATEGORY",
          endpoint: `${API_URL}/categories/${categoryId}/`,
          method: "PATCH",
          body: JSON.stringify({ name }),
          headers: { "Content-Type": "application/json" },
          timestamp: Date.now(),
          retries: 0,
        });
      });

    return true;
  }

  // Offline: queue for later sync
  await addToSyncQueue({
    action: "EDIT_CATEGORY",
    endpoint: `${API_URL}/categories/${categoryId}/`,
    method: "PATCH",
    body: JSON.stringify({ name }),
    headers: { "Content-Type": "application/json" },
    timestamp: Date.now(),
    retries: 0,
  });

  return true;
}

// --- USER PROFILE ---

/**
 * Get current user with offline fallback.
 * - Online: fetches from API, saves to IndexedDB, returns user
 * - Offline: returns cached user from IndexedDB, or a placeholder if token exists
 * - No token: returns null (user must login)
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
  if (cached) return cached;

  // Token exists but no cached profile (first time offline with new code)
  // Return a placeholder so the app doesn't redirect to login
  return {
    id: 0,
    username: "Utente",
    email: "",
    profile_picture: null,
  };
}

// --- REORDER & SORT ---

/**
 * Reorder todos with optimistic updates.
 * Updates local DB immediately, then syncs to backend in background.
 */
export async function reorderTodosOffline(
  listId: number | string,
  order: number[]
): Promise<boolean> {
  const id = Number(listId);

  // OPTIMISTIC: Reorder locally FIRST
  const local = await getLocalList(id);
  if (local) {
    // Create a map of id -> todo
    const todoMap = new Map(local.todos.map((t) => [t.id, t]));
    // Reorder based on the new order
    const reordered = order
      .map((todoId) => todoMap.get(todoId))
      .filter((t): t is NonNullable<typeof t> => t !== undefined);
    // Add any todos that weren't in the order array (edge case)
    const orderedIds = new Set(order);
    const remaining = local.todos.filter((t) => !orderedIds.has(t.id));
    local.todos = [...reordered, ...remaining];
    await saveListToLocal(local);
  }

  if (navigator.onLine) {
    // Send to backend in BACKGROUND (don't await)
    fetchWithAuth(`${API_URL}/lists/${listId}/reorder/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ order }),
    })
      .then((res) => {
        if (res.ok) {
          invalidateCache(new RegExp(`^list:${listId}`));
        } else {
          // API failed: queue for retry
          addToSyncQueue({
            action: "REORDER_TODOS",
            endpoint: `${API_URL}/lists/${listId}/reorder/`,
            method: "POST",
            body: JSON.stringify({ order }),
            headers: { "Content-Type": "application/json" },
            timestamp: Date.now(),
            retries: 0,
          });
        }
      })
      .catch(() => {
        // Network error: queue for retry
        addToSyncQueue({
          action: "REORDER_TODOS",
          endpoint: `${API_URL}/lists/${listId}/reorder/`,
          method: "POST",
          body: JSON.stringify({ order }),
          headers: authHeaders(),
          timestamp: Date.now(),
          retries: 0,
        });
      });

    return true;
  }

  // Offline: queue for later sync
  await addToSyncQueue({
    action: "REORDER_TODOS",
    endpoint: `${API_URL}/lists/${listId}/reorder/`,
    method: "POST",
    body: JSON.stringify({ order }),
    headers: authHeaders(),
    timestamp: Date.now(),
    retries: 0,
  });

  return true;
}

/**
 * Update sort order with optimistic updates.
 * Updates local DB immediately, then syncs to backend in background.
 */
export async function updateSortOrderOffline(
  listId: number | string,
  sortOrder: string
): Promise<boolean> {
  const id = Number(listId);

  // OPTIMISTIC: Update locally FIRST and mark dirty so background fetch won't overwrite
  const local = await getLocalList(id);
  if (local) {
    (local as any).sort_order = sortOrder;
    (local as any)._syncStatus = "dirty";
    (local as any)._localUpdatedAt = Date.now();
    await saveListToLocal(local);
  }

  if (navigator.onLine) {
    // Send to backend in BACKGROUND (don't await)
    fetchWithAuth(`${API_URL}/lists/${id}/sort_order/`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ sort_order: sortOrder }),
    })
      .then(async (res) => {
        if (res.ok) {
          invalidateCache(new RegExp(`^list:${id}`));
          // Mark as synced: PATCH confirmed, background fetch can now use server value
          const confirmed = await getLocalList(id);
          if (confirmed && (confirmed as any)._syncStatus === "dirty") {
            (confirmed as any)._syncStatus = "synced";
            await saveListToLocal(confirmed);
          }
        } else {
          // API failed: queue for retry
          addToSyncQueue({
            action: "UPDATE_SORT_ORDER",
            endpoint: `${API_URL}/lists/${id}/sort_order/`,
            method: "PATCH",
            body: JSON.stringify({ sort_order: sortOrder }),
            headers: { "Content-Type": "application/json" },
            timestamp: Date.now(),
            retries: 0,
          });
        }
      })
      .catch(() => {
        // Network error: queue for retry
        addToSyncQueue({
          action: "UPDATE_SORT_ORDER",
          endpoint: `${API_URL}/lists/${id}/sort_order/`,
          method: "PATCH",
          body: JSON.stringify({ sort_order: sortOrder }),
          headers: authHeaders(),
          timestamp: Date.now(),
          retries: 0,
        });
      });

    return true;
  }

  // Offline: queue for later sync
  await addToSyncQueue({
    action: "UPDATE_SORT_ORDER",
    endpoint: `${API_URL}/lists/${id}/sort_order/`,
    method: "PATCH",
    body: JSON.stringify({ sort_order: sortOrder }),
    headers: authHeaders(),
    timestamp: Date.now(),
    retries: 0,
  });

  return true;
}

/**
 * Move todo with optimistic updates.
 * Updates local DB immediately, then syncs to backend in background.
 */
export async function moveTodoOffline(
  todoId: number,
  newListId: number
): Promise<boolean> {
  // OPTIMISTIC: Move locally FIRST
  const allLists = await getLocalLists();
  let movedTodo: any = null;

  // Find and remove from current list
  for (const list of allLists) {
    const idx = list.todos.findIndex((t) => t.id === todoId);
    if (idx !== -1) {
      movedTodo = list.todos[idx];
      list.todos.splice(idx, 1);
      await saveListToLocal(list);
      break;
    }
  }

  // Add to new list
  if (movedTodo) {
    const targetList = await getLocalList(newListId);
    if (targetList) {
      targetList.todos.push(movedTodo);
      await saveListToLocal(targetList);
    }
  }

  if (navigator.onLine && todoId > 0) {
    // Send to backend in BACKGROUND (don't await)
    fetchWithAuth(`${API_URL}/todos/${todoId}/move/`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ new_list_id: newListId }),
    })
      .then((res) => {
        if (res.ok) {
          invalidateCache(/^lists?:/);
        } else {
          // API failed: queue for retry
          addToSyncQueue({
            action: "MOVE_TODO",
            endpoint: `${API_URL}/todos/${todoId}/move/`,
            method: "PATCH",
            body: JSON.stringify({ new_list_id: newListId }),
            headers: { "Content-Type": "application/json" },
            timestamp: Date.now(),
            retries: 0,
          });
        }
      })
      .catch(() => {
        // Network error: queue for retry
        addToSyncQueue({
          action: "MOVE_TODO",
          endpoint: `${API_URL}/todos/${todoId}/move/`,
          method: "PATCH",
          body: JSON.stringify({ new_list_id: newListId }),
          headers: authHeaders(),
          timestamp: Date.now(),
          retries: 0,
        });
      });

    return true;
  }

  // Offline: queue for later sync (only for real todos)
  if (todoId > 0) {
    await addToSyncQueue({
      action: "MOVE_TODO",
      endpoint: `${API_URL}/todos/${todoId}/move/`,
      method: "PATCH",
      body: JSON.stringify({ new_list_id: newListId }),
      headers: authHeaders(),
      timestamp: Date.now(),
      retries: 0,
    });
  }

  return true;
}

// Re-export auth headers for components that need them
export { authHeaders, authHeadersNoContentType };
