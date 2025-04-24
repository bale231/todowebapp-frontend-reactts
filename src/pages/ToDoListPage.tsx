import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckSquare, Pencil, Plus, Trash, ListFilter } from "lucide-react";
import { getAuthHeaders } from "../api/todos";
import gsap from "gsap";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  TouchSensor,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  createTodo,
  deleteTodo,
  updateTodo,
  toggleTodo,
  reorderTodos,
  updateSortOrder,
} from "../api/todos";

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

const colorThemes: Record<string, string> = {
  blue: "bg-blue-100 dark:bg-blue-900",
  green: "bg-green-100 dark:bg-green-900",
  yellow: "bg-yellow-100 dark:bg-yellow-900",
  red: "bg-red-100 dark:bg-red-900",
  purple: "bg-purple-100 dark:bg-purple-900",
};

const colorMap: Record<string, string> = {
  blue: "bg-blue-600 hover:bg-blue-700",
  green: "bg-green-600 hover:bg-green-700",
  yellow: "bg-yellow-500 hover:bg-yellow-600",
  red: "bg-red-600 hover:bg-red-700",
  purple: "bg-purple-600 hover:bg-purple-700",
};

export default function ToDoListPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [listName, setListName] = useState("");
  const [listColor, setListColor] = useState("blue");
  const [editedTodo, setEditedTodo] = useState<Todo | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const shouldAnimate = useRef(true);
  const wasModalClosed = useRef(true);
  const [sortOption, setSortOption] = useState<"created" | "alphabetical">(
    "created"
  );

  const listRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor));
  const animateTodos = () => {
    if (listRef.current) {
      gsap.fromTo(
        listRef.current.children,
        { x: 30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: "power2.out" }
      );
    }
  };

  const fetchTodos = useCallback(
    async (preserveSort = false) => {
      const res = await fetch(`https://bale231.pythonanywhere.com/api/lists/${id}/`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      const text = await res.text();
      const data = JSON.parse(text);
      setTodos(data.todos);

      if (!preserveSort) {
        setSortOption(data.sort_order || "created");
      }

      setListName(data.name);
      setListColor(data.color || "blue");
      if (shouldAnimate.current) {
        setTimeout(() => animateTodos(), 50);
        shouldAnimate.current = false; // ❌ dopo la prima animazione, disattiva
      }
    },
    [id]
  );

  const handleCreate = async () => {
    if (!title.trim()) return;
    await createTodo(Number(id), title);
    setTitle("");
    fetchTodos();
  };

  const handleToggle = async (todoId: number) => {
    await toggleTodo(todoId);
    await fetchTodos();
  };

  const handleDelete = async (todoId: number) => {
    await deleteTodo(todoId);
    fetchTodos();
  };

  const handleEdit = async () => {
    if (editedTodo) {
      await updateTodo(editedTodo.id, editedTodo.title);
      setEditedTodo(null);
      shouldAnimate.current = false; // 👈 Disattiva l'animazione!
      fetchTodos();
    }
  };

  const handleDragEnd = async (event: any) => {
    if (sortOption === "alphabetical") return; // 👈 Evita il drag in ordine alfabetico

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = todos.findIndex((t) => t.id === Number(active.id));
    const newIndex = todos.findIndex((t) => t.id === Number(over.id));
    const newTodos = arrayMove(todos, oldIndex, newIndex);
    setTodos(newTodos);

    const newOrder = newTodos.map((t) => t.id);
    await reorderTodos(id, newOrder);
  };

  const handleSortChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value as "created" | "alphabetical";
    if (!id) return;

    await updateSortOrder(id, newSort);
    setSortOption(newSort); // 👈 Prima aggiorni lo stato local
    fetchTodos(true); // 👈 Passi true per NON sovrascrivere
  };

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    setThemeLoaded(true);
  }, []);

  useEffect(() => {
    if (editedTodo && wasModalClosed.current && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
      );
      wasModalClosed.current = false;
    } else if (!editedTodo) {
      wasModalClosed.current = true;
    }
  }, [editedTodo]);

  useEffect(() => {
    shouldAnimate.current = true;
    fetchTodos();
  }, [fetchTodos]);

  useEffect(() => {
    gsap.fromTo(
      ".fab-button",
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.7)" }
    );
  }, [menuOpen]);

  if (!themeLoaded) return null;

  const displayedTodos = todos;

  return (
    <div
      className={`min-h-screen ${colorThemes[listColor]} text-gray-900 dark:text-white p-6`}
    >
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          {listName}
        </h1>
        <button
          onClick={() => navigate("/")}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Torna alla Home
        </button>
      </div>

      <div className="mb-6 flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nuova ToDo..."
          className="px-4 py-2 rounded border w-full dark:bg-gray-800"
        />
        <button
          onClick={handleCreate}
          className={`${colorMap[listColor]} text-white px-4 py-2 rounded`}
        >
          <Plus size={18} />
        </button>
      </div>

      {sortOption === "created" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displayedTodos.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div ref={listRef} className="space-y-3">
              {displayedTodos.map((todo) => (
                <SortableTodo
                  key={todo.id}
                  todo={todo}
                  onCheck={handleToggle}
                  onDelete={handleDelete}
                  onEdit={() => setEditedTodo(todo)}
                  editMode={editMode}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div ref={listRef} className="space-y-3">
          {displayedTodos.map((todo) => (
            <SortableTodo
              key={todo.id}
              todo={todo}
              onCheck={handleToggle}
              onDelete={handleDelete}
              onEdit={() => setEditedTodo(todo)}
              editMode={editMode}
            />
          ))}
        </div>
      )}

      {/* Floating Menu */}
      <div className="fixed bottom-6 left-6 z-50">
        <div
          className={`flex flex-col items-start space-y-2 mb-2 transition-all ${
            menuOpen
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 pointer-events-none"
          }`}
        >
          <button
            onClick={() => setEditMode((prev) => !prev)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded"
          >
            <Pencil size={18} /> Modifica
          </button>

          <div className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded">
            <ListFilter size={18} />
            <select
              value={sortOption}
              onChange={handleSortChange}
              className="bg-transparent text-black text-sm"
            >
              <option value="created">Per Creazione</option>
              <option value="alphabetical">Alfabetico</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`w-14 h-14 flex items-center justify-center rounded-full transition-transform duration-300 ${
            colorMap[listColor]
          } text-white ${menuOpen ? "rotate-45" : "rotate-0"}`}
        >
          <Plus size={28} className="transition-transform duration-300" />
        </button>
      </div>

      {/* Modale modifica ToDo */}
      {editedTodo && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            ref={modalRef}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg w-80"
          >
            <h2 className="text-xl font-semibold mb-4">Modifica ToDo</h2>
            <input
              value={editedTodo.title}
              onChange={(e) =>
                setEditedTodo({ ...editedTodo, title: e.target.value })
              }
              className="w-full px-4 py-2 border rounded mb-4 dark:bg-gray-700 dark:text-white"
            />
            <div className="flex justify-between">
              <button
                onClick={() => setEditedTodo(null)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 dark:bg-gray-600 dark:text-white"
              >
                Annulla
              </button>
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableTodo({
  todo,
  onCheck,
  onDelete,
  onEdit,
  editMode,
}: {
  todo: Todo;
  onCheck: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: () => void;
  editMode: boolean;
}) {
  const { setNodeRef, attributes, listeners, transform, transition } =
    useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-2 rounded shadow"
    >
      <div
        className={`flex items-center gap-2 ${
          todo.completed ? "line-through text-gray-400" : ""
        }`}
      >
        {/* ✅ Check */}
        <button
          onClick={() => onCheck(todo.id)}
          className="text-green-600 hover:text-green-800"
        >
          <CheckSquare size={20} />
        </button>

        {/* ✅ Titolo */}
        <span>{todo.title}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* ✅ Drag handle (solo qui) */}
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-400 hover:text-gray-600"
          title="Trascina"
        >
          ⠿
        </span>

        {/* ✅ Pulsanti visibili solo in editMode */}
        {editMode && (
          <>
            <button
              onClick={onEdit}
              className="text-blue-500 hover:text-blue-700"
            >
              <Pencil size={18} />
            </button>
            <button
              onClick={() => onDelete(todo.id)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
