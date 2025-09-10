// ✅ src/api/todos.ts - gestisce tutto ciò che riguarda liste e ToDo
const API_URL = "https://bale231.pythonanywhere.com/api";

// Sostituisci getAuthHeaders con:
export function getAuthHeaders() {
  const token =
    sessionStorage.getItem("accessToken") ||
    localStorage.getItem("accessToken");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function jsonOrNull(res: Response) {
  if (res.status === 204) return null;           // niente body
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

function assertOk(res: Response) {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
}


// --- 📋 LISTE ---
export async function fetchAllLists() {
  const res = await fetch(`${API_URL}/lists/`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  assertOk(res);
  return jsonOrNull(res);
}

export async function fetchListDetails(listId: number | string) {
  const headers = getAuthHeaders();

  const res = await fetch(`${API_URL}/lists/${listId}/`, {
    method: "GET",
    headers: headers,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ RESPONSE TEXT:", text);
  }

  assertOk(res);
  return jsonOrNull(res);
}

export async function renameList(listId: number, newName: string) {
  const res = await fetch(`${API_URL}/lists/${listId}/rename/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name: newName }),
  });
  assertOk(res);
  return jsonOrNull(res);
}

// ✅ Modifica lista (PUT su /lists/:id/)
export async function editList(listId: number, name: string, color: string) {
  const res = await fetch(`${API_URL}/lists/${listId}/`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, color }),
  });
  assertOk(res);
  return jsonOrNull(res);
}

// ✅ Elimina lista (DELETE su /lists/:id/)
export async function deleteList(listId: number) {
  const res = await fetch(`${API_URL}/lists/${listId}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  assertOk(res);
  return jsonOrNull(res);
}


// --- ✅ TODOS ---
export async function createTodo(listId: number | string, title: string) {
  const res = await fetch(`${API_URL}/lists/${listId}/todos/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ title }),
  });
  assertOk(res);
  return jsonOrNull(res);
}

export async function toggleTodo(todoId: number) {
  const res = await fetch(`${API_URL}/todos/${todoId}/toggle/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
  assertOk(res);
  return jsonOrNull(res);
}

export async function deleteTodo(todoId: number) {
  const res = await fetch(`${API_URL}/todos/${todoId}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  assertOk(res);
  return jsonOrNull(res);
}

// ✅ PATCH modifica titolo di una ToDo
export async function updateTodo(todoId: number, title: string) {
  const res = await fetch(`${API_URL}/todos/${todoId}/update/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ title }),
  });
  assertOk(res);
  return jsonOrNull(res);
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
  assertOk(res);
  return jsonOrNull(res);
}

// ✅ PATCH per modificare l'ordine
export async function updateSortOrder(listId: number | string, sortOrder: string) {
  const res = await fetch(`${API_URL}/lists/${listId}/sort_order/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ sort_order: sortOrder }),
  });

  assertOk(res);
  return jsonOrNull(res);
   // ritorna { sort_order: "..." }
}