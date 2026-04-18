/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  deduplicatedFetch,
  invalidateCache,
  CACHE_TTL,
  createCacheKey,
} from "../utils/apiCache";
import { refreshTokenIfNeeded } from "./auth";

const API_URL = "https://bale231.pythonanywhere.com/api";

export function getAuthHeaders() {
  const token =
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Fetch wrapper that automatically handles 401 by refreshing token and retrying.
 * Use this for all authenticated API calls to prevent auth failures.
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = getAuthHeaders();
  const mergedHeaders = { ...headers, ...(options.headers as Record<string, string>) };

  const res = await fetch(url, { ...options, headers: mergedHeaders });

  if (res.status === 401) {
    const newToken = await refreshTokenIfNeeded();
    if (newToken) {
      const retryHeaders = { ...mergedHeaders, Authorization: `Bearer ${newToken}` };
      return fetch(url, { ...options, headers: retryHeaders });
    }
  }

  return res;
}

// --- 📋 LISTE ---
export async function fetchAllLists() {
  const cacheKey = createCacheKey("lists", "all");
  return deduplicatedFetch(
    cacheKey,
    async () => {
      const res = await fetch(`${API_URL}/lists/`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      return res.json();
    },
    CACHE_TTL.LISTS
  );
}

// Force refresh lists (bypasses cache)
export async function fetchAllListsForce() {
  invalidateCache(/^lists:/);
  return fetchAllLists();
}

export async function fetchListDetails(listId: number | string) {
  const cacheKey = createCacheKey("list", listId.toString());
  return deduplicatedFetch(
    cacheKey,
    async () => {
      const res = await fetch(`${API_URL}/lists/${listId}/`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("❌ RESPONSE TEXT:", text);
      }

      return res.json();
    },
    CACHE_TTL.TODO_DETAILS
  );
}

// Force refresh list details (bypasses cache)
export async function fetchListDetailsForce(listId: number | string) {
  invalidateCache(new RegExp(`^list:${listId}`));
  return fetchListDetails(listId);
}

export async function renameList(listId: number, newName: string) {
  const res = await fetch(`${API_URL}/lists/${listId}/rename/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name: newName }),
  });
  return res.json();
}

// ✅ Modifica lista con categoria (PUT su /lists/:id/)
export async function editList(listId: number, name: string, color: string, categoryId?: number | null) {
  const body: Record<string, any> = { name, color };
  if (typeof categoryId !== "undefined") body.category = categoryId;
  const res = await fetch(`${API_URL}/lists/${listId}/`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  // Invalidate cache after modification
  invalidateCache(/^lists?:/);
  return res.json();
}

export async function createList(name: string, color: string, categoryId?: number | null) {
  const body: Record<string, any> = { name, color };
  if (typeof categoryId !== "undefined") body.category = categoryId;
  const res = await fetch(`${API_URL}/lists/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  invalidateCache(/^lists:/);
  return res.json();
}

export async function deleteList(listId: number) {
  const res = await fetch(`${API_URL}/lists/${listId}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  invalidateCache(/^lists?:/);
  return res.json();
}

// 📦 Archivia/Disarchivia lista
export async function archiveList(listId: number) {
  const res = await fetch(`${API_URL}/lists/${listId}/archive/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
  invalidateCache(/^lists?:/);
  return res.json();
}

export async function unarchiveList(listId: number) {
  const res = await fetch(`${API_URL}/lists/${listId}/unarchive/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
  invalidateCache(/^lists?:/);
  return res.json();
}

// --- 📂 CATEGORIE ---
// Lista tutte le categorie
export async function fetchAllCategories() {
  const cacheKey = createCacheKey("categories", "all");
  return deduplicatedFetch(
    cacheKey,
    async () => {
      const res = await fetch(`${API_URL}/categories/`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      return res.json();
    },
    CACHE_TTL.CATEGORIES
  );
}

// Force refresh categories
export async function fetchAllCategoriesForce() {
  invalidateCache(/^categories:/);
  return fetchAllCategories();
}

// Crea una nuova categoria
export async function createCategory(name: string) {
  const res = await fetch(`${API_URL}/categories/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  });
  invalidateCache(/^categories:/);
  return res.json();
}

// Modifica una categoria
export async function editCategory(categoryId: number, name: string) {
  const res = await fetch(`${API_URL}/categories/${categoryId}/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  });
  invalidateCache(/^categories:/);
  return res.json();
}

// Elimina una categoria
export async function deleteCategory(categoryId: number) {
  const res = await fetch(`${API_URL}/categories/${categoryId}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  invalidateCache(/^categories:/);
  return res.json();
}

// --- ✅ TODOS ---
export async function createTodo(
  listId: number | string,
  title: string,
  quantity?: number | null,
  unit?: string | null
) {
  const body: Record<string, any> = { title };
  if (quantity !== undefined && quantity !== null) body.quantity = quantity;
  if (unit !== undefined && unit !== null) body.unit = unit;

  const res = await fetch(`${API_URL}/lists/${listId}/todos/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  invalidateCache(/^lists?:/);
  return res.json();
}

export async function toggleTodo(todoId: number) {
  const res = await fetch(`${API_URL}/todos/${todoId}/toggle/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
  invalidateCache(/^lists?:/);
  return res.json();
}

export async function deleteTodo(todoId: number) {
  const res = await fetch(`${API_URL}/todos/${todoId}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  invalidateCache(/^lists?:/);
  return res.json();
}

// ✅ PATCH modifica titolo di una ToDo (e opzionalmente quantità/unità)
export async function updateTodo(
  todoId: number,
  title: string,
  quantity?: number | null,
  unit?: string | null
) {
  const body: Record<string, any> = { title };
  if (quantity !== undefined) body.quantity = quantity;
  if (unit !== undefined) body.unit = unit;

  const res = await fetch(`${API_URL}/todos/${todoId}/update/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  invalidateCache(/^lists?:/);
  return res.json();
}

// ✅ POST per riordinare le ToDo
export async function reorderTodos(
  listId: string | undefined,
  order: number[]
) {
  const res = await fetch(`${API_URL}/lists/${listId}/reorder/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ order }),
  });
  invalidateCache(new RegExp(`^list:${listId}`));
  return res.json();
}

// ✅ PATCH per modificare l'ordine
export async function updateSortOrder(listId: number | string, sortOrder: string) {
  const res = await fetch(`${API_URL}/lists/${listId}/sort_order/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ sort_order: sortOrder }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("❌ updateSortOrder failed:", res.status, errorText);
    throw new Error(`Failed to update sort order: ${res.status}`);
  }

  invalidateCache(new RegExp(`^list:${listId}`));
  return res.json();
}

// ✅ PATCH per spostare una ToDo in un'altra lista
export async function moveTodo(todoId: number, newListId: number) {
  const res = await fetch(`${API_URL}/todos/${todoId}/move/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ new_list_id: newListId }),
  });
  invalidateCache(/^lists?:/);
  return res.json();
}

// --- 🎯 PREFERENZE CATEGORIA ---
// Salva la categoria selezionata dall'utente
export async function saveSelectedCategory(categoryId: number | null) {
  const res = await fetch(`${API_URL}/categories/selected/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ selected_category: categoryId }),
  });
  invalidateCache(/^prefs:/);
  if (!res.ok) {
    const errText = await res.text();
    console.error(`❌ saveSelectedCategory failed: ${res.status}`, errText);
    return null;
  }
  return res.json();
}

// Recupera la categoria selezionata dall'utente
export async function getSelectedCategory() {
  const cacheKey = createCacheKey("prefs", "selected_category");
  return deduplicatedFetch(
    cacheKey,
    async () => {
      const res = await fetch(`${API_URL}/categories/selected/`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      return res.json();
    },
    CACHE_TTL.USER_PREFS
  );
}

// --- 🔄 CACHE UTILITIES ---
// Clear all cache (useful after logout or major changes)
export function clearApiCache() {
  invalidateCache();
}
