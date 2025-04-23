// ✅ src/api/todos.ts - gestisce tutto ciò che riguarda liste e ToDo
const API_URL = "https://bale231.pythonanywhere.com/api";

function getAuthHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// --- 📋 LISTE ---
export async function fetchAllLists() {
  const res = await fetch(`${API_URL}/lists/`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  return res.json();
}

export async function fetchListDetails(listId: number | string) {
  const res = await fetch(`${API_URL}/lists/${listId}/`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  return res.json();
}

export async function renameList(listId: number, newName: string) {
  const res = await fetch(`${API_URL}/lists/${listId}/rename/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name: newName }),
  });
  return res.json();
}

// ✅ Modifica lista (PUT su /lists/:id/)
export async function editList(listId: number, name: string, color: string) {
  const res = await fetch(`${API_URL}/lists/${listId}/`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, color }),
  });
  return res.json();
}

// ✅ Elimina lista (DELETE su /lists/:id/)
export async function deleteList(listId: number) {
  const res = await fetch(`${API_URL}/lists/${listId}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return res.json();
}


// --- ✅ TODOS ---
export async function createTodo(listId: number | string, title: string) {
  const res = await fetch(`${API_URL}/lists/${listId}/todos/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ title }),
  });
  return res.json();
}

export async function toggleTodo(todoId: number) {
  const res = await fetch(`${API_URL}/todos/${todoId}/toggle/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
  return res.json();
}

export async function deleteTodo(todoId: number) {
  const res = await fetch(`${API_URL}/todos/${todoId}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return res.json();
}

// ✅ PATCH modifica titolo di una ToDo
export async function updateTodo(todoId: number, title: string) {
  const res = await fetch(`${API_URL}/todos/${todoId}/update/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
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
    headers: getAuthHeaders(),
    body: JSON.stringify({ order }),
  });
  return res.json();
}

// ✅ PATCH per modificare l'ordine
export async function updateSortOrder(listId: number | string, sortOrder: string) {
  const res = await fetch(`${API_URL}/lists/${listId}/sort_order/`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ sort_order: sortOrder }),
  });
  return res.json(); // ritorna { sort_order: "..." }
}