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
  blue: "from-blue-50 via-white to-purple-50 dark:from-blue-900 dark:via-gray-800 dark:to-purple-900",
  green: "from-green-50 via-white to-blue-50 dark:from-green-900 dark:via-gray-800 dark:to-blue-900",
  yellow: "from-yellow-50 via-white to-orange-50 dark:from-yellow-900 dark:via-gray-800 dark:to-orange-900",
  red: "from-red-50 via-white to-pink-50 dark:from-red-900 dark:via-gray-800 dark:to-pink-900",
  purple: "from-purple-50 via-white to-blue-50 dark:from-purple-900 dark:via-gray-800 dark:to-blue-900",
};

const colorMap: Record<string, string> = {
  blue: "bg-blue-600/80 hover:bg-blue-600/90 border-blue-300/30",
  green: "bg-green-600/80 hover:bg-green-600/90 border-green-300/30",
  yellow: "bg-yellow-500/80 hover:bg-yellow-500/90 border-yellow-300/30",
  red: "bg-red-600/80 hover:bg-red-600/90 border-red-300/30",
  purple: "bg-purple-600/80 hover:bg-purple-600/90 border-purple-300/30",
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
  const [sortOption, setSortOption] = useState<"created" | "alphabetical">("created");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false); // NUOVO: Track del drag&drop

  const listRef = useRef<HTMLDivElement>(null);
  const bulkModalRef = useRef<HTMLDivElement>(null);

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

  // NUOVO: Handler per inizio drag
  const handleDragStart = () => {
    setIsDragging(true);
  };

  // AGGIORNATO: Handler per fine drag
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = async (event: any) => {
    setIsDragging(false); // Fine drag
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
    setSortOption(newSort);
    fetchTodos(true);
  };

  // Animazioni GSAP
  useEffect(() => {
    if (showBulkConfirm && bulkModalRef.current) {
      gsap.fromTo(
        bulkModalRef.current,
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "power2.out" }
      );
    }
  }, [showBulkConfirm]);

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
    <div className={`min-h-screen bg-gradient-to-br ${colorThemes[listColor]} text-gray-900 dark:text-white p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          {listName}
        </h1>
        <button
          onClick={() => navigate("/home")}
          className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/30 hover:bg-white/30 transition-all"
        >
          <ArrowLeft size={20} />
          <span className="hidden sm:inline text-lg">Torna alla Home</span>
        </button>
      </div>

      {/* MASTER CHECKBOX (solo in editMode) */}
      {editMode && (
        <div className="mb-4 p-4 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={selectedIds.length === todos.length}
              onChange={(e) => {
                if (e.target.checked) setSelectedIds(todos.map((t) => t.id));
                else setSelectedIds([]);
              }}
            />
            <div className="w-6 h-6 border-2 border-gray-300 rounded-md bg-white/50 dark:bg-gray-800/50 relative transition-all duration-200 ease-out peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-300">
              <svg
                className="absolute inset-0 m-auto w-4 h-4 text-white opacity-0 scale-50 transition-all duration-150 ease-out peer-checked:opacity-100 peer-checked:scale-100"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="ml-2 font-medium">
              Seleziona tutte le ToDo
            </span>
          </label>

          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowBulkConfirm(true)}
              className="mt-3 px-4 py-2 bg-red-600/80 backdrop-blur-sm border border-red-300/30 text-white rounded-lg hover:bg-red-600/90 transition-all"
            >
              Elimina selezionate ({selectedIds.length})
            </button>
          )}
        </div>
      )}

      <div className="mb-6 flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nuova ToDo..."
          className="px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl w-full placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all"
        />
        <button
          onClick={handleCreate}
          className={`${colorMap[listColor]} backdrop-blur-md border text-white px-4 py-2 rounded-xl transition-all`}
        >
          <Plus size={18} />
        </button>
      </div>

      {sortOption === "created" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart} // NUOVO: Aggiungi handler inizio drag
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displayedTodos.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div
              ref={listRef}
              className="space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1 pb-24"
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
                  isDragging={isDragging} // NUOVO: Passa stato drag
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div
          ref={listRef}
          className="space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1 pb-24"
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
              isDragging={false} // NUOVO: Passa false quando non in drag context
            />
          ))}
        </div>
      )}

      {/* Floating Menu */}
      <div className="fixed bottom-6 left-6 z-50">
        <div
          className={`flex flex-col items-start space-y-2 mb-2 transition-all duration-200 ${
            menuOpen
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 pointer-events-none"
          }`}
        >
          <button
            onClick={() => setEditMode((prev) => !prev)}
            className="flex items-center gap-2 bg-green-600/80 backdrop-blur-md border border-green-300/30 text-white px-4 py-2 rounded-xl hover:bg-green-600/90 transition-all"
          >
            <Pencil size={18} /> Modifica
          </button>

          <div className="flex items-center gap-2 bg-yellow-500/80 backdrop-blur-md border border-yellow-300/30 text-white px-4 py-2 rounded-xl hover:bg-yellow-500/90 transition-all">
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
          onClick={() => {
            setMenuOpen((prev) => {
              const next = !prev;
              if (!next) setEditMode(false);
              return next;
            });
          }}
          className={`w-14 h-14 flex items-center justify-center rounded-full backdrop-blur-md border transition-all duration-200 ${
            colorMap[listColor]
          } text-white ${menuOpen ? "rotate-45" : "rotate-0"}`}
        >
          <Plus size={28} className="transition-transform duration-300" />
        </button>
      </div>

      {/* Modale modifica ToDo */}
      {editedTodo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            ref={modalRef}
            className="bg-white/20 dark:bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/30 dark:border-white/20 shadow-2xl w-80"
          >
            <h2 className="text-xl font-semibold mb-4">Modifica ToDo</h2>
            <input
              value={editedTodo.title}
              onChange={(e) =>
                setEditedTodo({ ...editedTodo, title: e.target.value })
              }
              className="w-full px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all"
            />
            <div className="flex justify-between gap-3">
              <button
                onClick={() => setEditedTodo(null)}
                className="flex-1 px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg hover:bg-white/30 transition-all"
              >
                Annulla
              </button>
              <button
                onClick={handleEdit}
                className="flex-1 px-4 py-2 bg-blue-600/80 backdrop-blur-sm border border-blue-300/30 text-white rounded-lg hover:bg-blue-600/90 transition-all"
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkConfirm &&
        createPortal(
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div
              ref={bulkModalRef}
              className="bg-white/20 dark:bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/30 dark:border-white/20 shadow-2xl w-80"
            >
              <h2 className="text-xl font-semibold mb-4">
                Elimina {selectedIds.length} ToDo?
              </h2>
              <p className="mb-6">
                Questa operazione è irreversibile.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowBulkConfirm(false)}
                  className="px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg hover:bg-white/30 transition-all"
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
                  className="px-4 py-2 bg-red-600/80 backdrop-blur-sm border border-red-300/30 text-white rounded-lg hover:bg-red-600/90 transition-all"
                >
                  Conferma
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* CSS per nascondere scrollbar */}
      <style>
        {`
          /* Nascondi scrollbar per Chrome, Safari e altri browser WebKit */
          .overflow-y-auto::-webkit-scrollbar {
            display: none;
          }
          
          /* Nascondi scrollbar per Firefox */
          .overflow-y-auto {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          * {
              -webkit-tap-highlight-color: transparent !important;
          }
        `}
      </style>
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
  isDragging, // NUOVO: Ricevi stato drag
}: {
  todo: Todo;
  onCheck: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: () => void;
  editMode: boolean;
  selectedIds: number[];
  setSelectedIds: React.Dispatch<React.SetStateAction<number[]>>;
  isDragging: boolean; // NUOVO: Tipo per isDragging
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
      disabled={isDragging} // NUOVO: Disabilita swipe durante drag
    >
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center justify-between bg-white/30 dark:bg-white/10 backdrop-blur-md px-6 py-3 rounded-xl border border-white/30 dark:border-white/20 shadow-lg text-xl font-semibold hover:bg-white/40 dark:hover:bg-white/15 transition-all"
      >
        <div
          className={`flex items-center gap-3 ${
            todo.completed ? "line-through text-gray-400" : ""
          }`}
        >
          {/* Checkbox */}
          {editMode && (
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={selectedIds.includes(todo.id)}
                onChange={(e) => {
                  if (e.target.checked)
                    setSelectedIds((ids) => [...ids, todo.id]);
                  else
                    setSelectedIds((ids) => ids.filter((i) => i !== todo.id));
                }}
              />
              <div className="w-6 h-6 border-2 border-gray-300 rounded-md bg-white/50 dark:bg-gray-800/50 relative transition-all duration-200 ease-out peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-300">
                <svg
                  className="absolute inset-0 m-auto w-4 h-4 text-white opacity-0 scale-50 transition-all duration-150 ease-out peer-checked:opacity-100 peer-checked:scale-100"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </label>
          )}

          {/* Check */}
          <button
            onClick={() => onCheck(todo.id)}
            className="text-green-600 hover:text-green-800 transition-colors"
          >
            <CheckSquare size={20} />
          </button>

          {/* Titolo */}
          <span>{todo.title}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab text-gray-400 hover:text-gray-600 touch-none transition-colors"
            title="Trascina"
          >
            ⠿
          </span>

          {/* Pulsanti visibili solo in editMode */}
          {editMode && (
            <>
              <button
                onClick={onEdit}
                className="p-1 bg-blue-500/20 backdrop-blur-sm rounded text-blue-600 hover:text-blue-700 hover:bg-blue-500/30 transition-all"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => onDelete(todo.id)}
                className="p-1 bg-red-500/20 backdrop-blur-sm rounded text-red-600 hover:text-red-700 hover:bg-red-500/30 transition-all"
              >
                <Trash size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </SwipeableTodoItem>
  );
}