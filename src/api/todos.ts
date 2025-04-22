// ✅ src/api/todo.ts - gestisce tutto ciò che riguarda liste e ToDo
const API_URL = "https://bale231.pythonanywhere.com/api";

// --- 📋 LISTE ---
export async function fetchAllLists() {
  const res = await fetch(`${API_URL}/lists/`, {
    credentials: "include",
  });
  return res.json();
}

export async function fetchListDetails(listId: number | string) {
  const res = await fetch(`${API_URL}/lists/${listId}/`, {
    credentials: "include",
  });
  return res.json();
}

export async function renameList(listId: number, newName: string) {
  const res = await fetch(`${API_URL}/lists/${listId}/rename/`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: newName }),
  });
  return res.json();
}

// --- ✅ TODOS ---
export async function createTodo(listId: number | string, title: string) {
  const res = await fetch(`${API_URL}/lists/${listId}/todos/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  return res.json();
}

export async function toggleTodo(todoId: number) {
  const res = await fetch(`${API_URL}/todos/${todoId}/toggle/`, {
    method: "PATCH",
    credentials: "include",
  });
  return res.json();
}

export async function deleteTodo(todoId: number) {
  const res = await fetch(`${API_URL}/todos/${todoId}/`, {
    method: "DELETE",
    credentials: "include",
  });
  return res.json();
}

// ✅ PATCH modifica titolo di una ToDo
export async function updateTodo(todoId: number, title: string) {
  const res = await fetch(`${API_URL}/todos/${todoId}/update/`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  return res.json();
}

// ✅ POST per riordinare le ToDo
export async function reorderTodos(
  listId: string | undefined,
  order: number[]
) {
  const res = await fetch(`${API_URL}/lists/${listId}/reorder/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order }),
  });
  return res.json();
}

// ✅ PATCH per modificare l'ordine
export async function updateSortOrder(listId: number | string, sortOrder: string) {
  const res = await fetch(`${API_URL}/lists/${listId}/sort_order/`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sort_order: sortOrder }),
  });
  return res.json(); // ritorna { sort_order: "..." }
}