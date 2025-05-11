import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CheckSquare,
  Pencil,
  Plus,
  Trash,
  ListFilter,
  ArrowLeft,
} from "lucide-react";
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
import { useTheme } from "../context/ThemeContext";
import SwipeableTodoItem from "../components/SwipeableTodoItem";
import { createPortal } from "react-dom";

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
  const { themeLoaded } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const shouldAnimate = useRef(true);
  const wasModalClosed = useRef(true);
  const [sortOption, setSortOption] = useState<"created" | "alphabetical">(
    "created"
  );
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );
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
      const res = await fetch(
        `https://bale231.pythonanywhere.com/api/lists/${id}/`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );
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
        shouldAnimate.current = false;
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
      shouldAnimate.current = false;
      fetchTodos();
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = async (event: any) => {
    if (sortOption === "alphabetical") return;

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
          onClick={() => navigate("/home")}
          className="flex items-center gap-2 text-[#121212]-600 hover:text-black-800 dark:text-[#d3d3d3]-400 dark:hover:text-white-300 transition"
        >
          <ArrowLeft size={20} />
          <span className="hidden sm:inline text-lg">Torna alla Home</span>
        </button>
      </div>

      {/* ←─────────────────────────────────────────── */}
      {/* MASTER CHECKBOX (solo in editMode) */}
      {editMode && (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedIds.length === todos.length}
            onChange={e => {
              if (e.target.checked) setSelectedIds(todos.map(t => t.id));
              else setSelectedIds([]);
            }}
            className="h-5 w-5"
          />
          <span className="font-medium">Seleziona tutte le ToDo</span>
          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowBulkConfirm(true)}
              className="ml-auto px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Elimina selezionate ({selectedIds.length})
            </button>
          )}
        </div>
      )}
      {/* ───────────────────────────────────────────→ */}

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
            <div
              ref={listRef}
              className="space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1 pb-24 invisible-scrollbar"
            >
              {displayedTodos.map((todo) => (
                <SortableTodo
                  key={todo.id}
                  todo={todo}
                  onCheck={handleToggle}
                  onDelete={handleDelete}
                  onEdit={() => setEditedTodo(todo)}
                  selectedIds={selectedIds}
                  setSelectedIds={setSelectedIds}
                  editMode={editMode}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div
          ref={listRef}
          className="space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1 pb-24 invisible-scrollbar"
        >
          {displayedTodos.map((todo) => (
            <SortableTodo
              key={todo.id}
              todo={todo}
              onCheck={handleToggle}
              onDelete={handleDelete}
              onEdit={() => setEditedTodo(todo)}
              editMode={editMode}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
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

      {showBulkConfirm &&
        createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg w-80">
              <h2 className="text-xl font-semibold mb-4">
                Elimina {selectedIds.length} ToDo?
              </h2>
              <p className="mb-6">Questa operazione è irreversibile.</p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowBulkConfirm(false)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Annulla
                </button>
                <button
                  onClick={async () => {
                    await Promise.all(selectedIds.map((i) => deleteTodo(i)));
                    setShowBulkConfirm(false);
                    setSelectedIds([]);
                    fetchTodos();
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Conferma
                </button>
              </div>
            </div>
          </div>,
          document.body
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
  selectedIds,
  setSelectedIds,
}: {
  todo: Todo;
  onCheck: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: () => void;
  editMode: boolean;
  selectedIds: number[];
  setSelectedIds: React.Dispatch<React.SetStateAction<number[]>>;
}) {
  const { setNodeRef, attributes, listeners, transform, transition } =
    useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <SwipeableTodoItem
      onEdit={onEdit}
      label={todo.title}
      onDelete={() => onDelete(todo.id)}
    >
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center justify-between bg-white dark:bg-gray-800 px-6 py-2 rounded shadow text-xl font-semibold"
      >
        <div
          className={`flex items-center gap-2 ${
            todo.completed ? "line-through text-gray-400" : ""
          }`}
        >
            {editMode && (
              <input
                type="checkbox"
                checked={selectedIds.includes(todo.id)}
                onChange={(e) => {
                  if (e.target.checked)
                    setSelectedIds((ids) => [...ids, todo.id]);
                  else
                    setSelectedIds((ids) => ids.filter((i) => i !== todo.id));
                }}
              />
            )}
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
          {/* ✅ Drag handle */}
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab text-gray-400 hover:text-gray-600 touch-none"
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
    </SwipeableTodoItem>
  );
}
