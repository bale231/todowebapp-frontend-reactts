import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CheckSquare,
  Pencil,
  Plus,
  Trash,
  ListFilter,
  ArrowLeft,
  ArrowRightLeft,
  Users,
  Search,
} from "lucide-react";
import { getAuthHeaders } from "../api/todos";
import { getCurrentUserJWT } from "../api/auth";
import gsap from "gsap";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
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
  moveTodo,
  fetchAllLists,
} from "../api/todos";
import { getListShares } from "../api/sharing";
import { useTheme } from "../context/ThemeContext";
import SwipeableTodoItem from "../components/SwipeableTodoItem";
import MoveTodoModal from "../components/MoveTodoModal";
import BottomNav from "../components/BottomNav";
import SearchBar from "../components/SearchBar";
import TodoSkeleton from "../components/TodoSkeleton";
import { createPortal } from "react-dom";
import { useThemeColor } from "../hooks/useThemeColor";

interface Todo {
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

const colorThemes: Record<string, string> = {
  blue: "from-blue-50 via-white to-purple-50 dark:from-blue-900 dark:via-gray-800 dark:to-purple-900",
  green:
    "from-green-50 via-white to-blue-50 dark:from-green-900 dark:via-gray-800 dark:to-blue-900",
  yellow:
    "from-yellow-50 via-white to-orange-50 dark:from-yellow-900 dark:via-gray-800 dark:to-orange-900",
  red: "from-red-50 via-white to-pink-50 dark:from-red-900 dark:via-gray-800 dark:to-pink-900",
  purple:
    "from-purple-50 via-white to-blue-50 dark:from-purple-900 dark:via-gray-800 dark:to-blue-900",
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
  const wasModalClosed = useRef(true);
  const [sortOption, setSortOption] = useState<
    "created" | "alphabetical" | "completed"
  >("created");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [sharedWith, setSharedWith] = useState<Array<{ username: string; full_name: string }>>([]);
  const [isShared, setIsShared] = useState(false);
  const [isOwner, setIsOwner] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Nuovi state per la modale Sposta
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [todoToMove, setTodoToMove] = useState<Todo | null>(null);
  const [allLists, setAllLists] = useState<
    { id: number; name: string; color: string }[]
  >([]);

  // Stati per la modale di quantità
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [quantityValue, setQuantityValue] = useState<string>("");
  const [unitValue, setUnitValue] = useState<string>("");
  const quantityModalRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Loading state
  const [isLoadingTodos, setIsLoadingTodos] = useState(true);

  const listRef = useRef<HTMLDivElement>(null);
  const bulkModalRef = useRef<HTMLDivElement>(null);

  useThemeColor(listColor);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Check if this specific list has already been animated in this session
  const hasAnimatedThisList = useCallback(() => {
    const animatedLists = sessionStorage.getItem("animatedLists");
    if (!animatedLists) return false;
    const lists = JSON.parse(animatedLists);
    return lists.includes(id);
  }, [id]);

  const markListAsAnimated = useCallback(() => {
    const animatedLists = sessionStorage.getItem("animatedLists");
    const lists = animatedLists ? JSON.parse(animatedLists) : [];
    if (!lists.includes(id)) {
      lists.push(id);
      sessionStorage.setItem("animatedLists", JSON.stringify(lists));
    }
  }, [id]);

  const animateTodos = useCallback(() => {
    if (listRef.current && !hasAnimatedThisList()) {
      gsap.fromTo(
        listRef.current.children,
        { x: 30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: "power2.out" }
      );
      markListAsAnimated();
    }
  }, [hasAnimatedThisList, markListAsAnimated]);

  const fetchTodos = useCallback(
    async (preserveSort = false) => {
      try {
        setIsLoadingTodos(true);
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

        // Salva info condivisione
        setIsShared(data.is_shared || false);
        setIsOwner(data.is_owner !== false);

        // Carica le informazioni di condivisione usando l'API dedicata
        try {
          const shares = await getListShares(Number(id));
          if (shares && shares.length > 0) {
            const mapped = shares.map(s => ({ username: s.username, full_name: s.full_name }));
            setSharedWith(mapped);
          } else {
            setSharedWith([]);
          }
        } catch (error) {
          console.error("Errore caricamento condivisioni:", error);
          setSharedWith([]);
        }

        // Animate only on first visit to this list in current session
        setTimeout(() => animateTodos(), 50);
      } finally {
        setIsLoadingTodos(false);
      }
    },
    [id, animateTodos]
  );

  // Carica tutte le liste per la modale Sposta
  const loadAllLists = async () => {
    const lists = await fetchAllLists();
    setAllLists(lists);
  };

  const handleCreateTodo = async () => {
    if (!title.trim()) {
      alert("Inserisci il titolo della todo");
      return;
    }

    // Quantità e unità sono opzionali
    let qty: number | null = null;
    let unit: string | null = null;

    if (quantityValue && unitValue.trim()) {
      // Se entrambi sono compilati, validali
      qty = parseInt(quantityValue);
      if (isNaN(qty) || qty <= 0) {
        alert("Quantità non valida");
        return;
      }
      unit = unitValue;
    } else if (quantityValue || unitValue.trim()) {
      // Se solo uno è compilato, avvisa
      alert("Compila sia quantità che unità, oppure lascia entrambi vuoti");
      return;
    }

    await createTodo(Number(id), title, qty, unit);
    setTitle("");
    setQuantityValue("");
    setUnitValue("");
    setShowQuantityModal(false);
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
      await updateTodo(
        editedTodo.id,
        editedTodo.title,
        editedTodo.quantity,
        editedTodo.unit
      );
      setEditedTodo(null);
      fetchTodos();
    }
  };

  // Gestisce lo spostamento della todo
  const handleMoveTodo = async (newListId: number) => {
    if (!todoToMove) return;

    await moveTodo(todoToMove.id, newListId);
    setShowMoveModal(false);
    setTodoToMove(null);
    fetchTodos();
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = async (event: any) => {
    setIsDragging(false);
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
    const newSort = e.target.value as "created" | "alphabetical" | "completed";
    if (!id) return;

    await updateSortOrder(id, newSort);
    setSortOption(newSort);
    fetchTodos(true);
  };

  const handleSortOptionSelect = async (newSort: "created" | "alphabetical" | "completed") => {
    if (!id) return;

    try {
      console.log("📤 Updating sort order to:", newSort);

      // Prima aggiorna il backend
      const result = await updateSortOrder(id, newSort);
      console.log("📥 Backend response:", result);

      // Aggiorna lo stato locale
      setSortOption(newSort);

      // Delay per dare tempo al backend di processare
      await new Promise(resolve => setTimeout(resolve, 300));

      // Ricarica i todos dal backend (ordinati)
      await fetchTodos(false);
    } catch (error) {
      console.error("❌ Errore ordinamento:", error);
    }
  };

  // Chiude il menu sort con animazione
  const closeSortMenu = () => {
    if (sortMenuRef.current) {
      gsap.to(sortMenuRef.current, {
        y: 100,
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => setShowSortMenu(false),
      });
    } else {
      setShowSortMenu(false);
    }
  };

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
    if (showQuantityModal && quantityModalRef.current) {
      gsap.fromTo(
        quantityModalRef.current,
        { scale: 0.9, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.2)" }
      );
    }
  }, [showQuantityModal]);

  useEffect(() => {
    if (showSortMenu && sortMenuRef.current) {
      gsap.fromTo(
        sortMenuRef.current,
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }
      );
    }
  }, [showSortMenu]);

  // Carica l'ID dell'utente corrente
  useEffect(() => {
    const loadCurrentUser = async () => {
      const user = await getCurrentUserJWT();
      if (user && user.id) {
        setCurrentUserId(user.id);
      }
    };
    loadCurrentUser();
  }, []);

  useEffect(() => {
    fetchTodos();
    loadAllLists();
  }, [fetchTodos]);

  useEffect(() => {
    gsap.fromTo(
      ".fab-button",
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.7)" }
    );
  }, [menuOpen]);

  // Filter todos based on search query
  const filteredTodos = useMemo(() => {
    if (!searchQuery.trim()) return todos;

    const query = searchQuery.toLowerCase().trim();
    return todos.filter((todo) => {
      // Check title
      if (todo.title.toLowerCase().includes(query)) return true;
      // Check unit if exists
      if (todo.unit && todo.unit.toLowerCase().includes(query)) return true;
      return false;
    });
  }, [todos, searchQuery]);

  if (!themeLoaded) return null;

  const displayedTodos = filteredTodos;

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${colorThemes[listColor]} text-gray-900 dark:text-white p-6 pb-24 lg:pb-6`}
    >
      {/* Search Bar - rendered conditionally */}
      {searchOpen && (
        <div className="mb-4">
          <SearchBar
            isOpen={searchOpen}
            onClose={() => setSearchOpen(false)}
            onSearch={setSearchQuery}
            placeholder="Cerca todo..."
          />
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            {listName}
          </h1>
          {/* Badge "Lista condivisa con" */}
          {sharedWith.length > 0 && (
            <div className="flex items-center gap-2 mt-2 text-sm text-purple-600 dark:text-purple-400">
              <Users size={16} />
              <span>
                Lista condivisa con {sharedWith.map((user) => user.full_name).join(", ")}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Search button */}
          {!searchOpen && (
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg p-2 rounded-xl border border-gray-200/50 dark:border-white/20 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all"
              title="Cerca"
            >
              <Search size={20} />
            </button>
          )}
          <button
            onClick={() => {
              navigate("/home");
              // La posizione verrà ripristinata automaticamente grazie all'useEffect
            }}
            className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg px-4 py-2 rounded-xl border border-gray-200/50 dark:border-white/20 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline text-lg">Torna alla Home</span>
          </button>
        </div>
      </div>

      {editMode && (
        <div className="mb-4 p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg rounded-xl border border-gray-200/50 dark:border-white/20">
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
            <span className="ml-2 font-medium">Seleziona tutte le ToDo</span>
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
          onKeyDown={(e) => {
            if (e.key === 'Enter') setShowQuantityModal(true);
          }}
          placeholder="Nuova ToDo..."
          className="px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg border border-gray-200/50 dark:border-white/20 rounded-xl w-full placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all"
        />
        <button
          onClick={() => setShowQuantityModal(true)}
          className={`${colorMap[listColor]} backdrop-blur-md border text-white px-4 py-2 rounded-xl transition-all hover:scale-105`}
          title="Aggiungi ToDo"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Skeleton loading */}
      {isLoadingTodos && (
        <div className="pb-24">
          <TodoSkeleton count={6} />
        </div>
      )}

      {/* No results message */}
      {!isLoadingTodos && displayedTodos.length === 0 && searchQuery.trim() && (
        <div className="text-center py-12">
          <Search size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-3" />
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Nessun risultato per "<span className="font-semibold">{searchQuery}</span>"
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Prova con un altro termine di ricerca
          </p>
        </div>
      )}

      {!isLoadingTodos && (sortOption === "created" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
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
                  onMove={() => {
                    setTodoToMove(todo);
                    setShowMoveModal(true);
                  }}
                  selectedIds={selectedIds}
                  setSelectedIds={setSelectedIds}
                  editMode={editMode}
                  isDragging={isDragging}
                  isShared={isShared}
                  isOwner={isOwner}
                  currentUserId={currentUserId}
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
              onMove={() => {
                setTodoToMove(todo);
                setShowMoveModal(true);
              }}
              editMode={editMode}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              isDragging={false}
              isShared={isShared}
              isOwner={isOwner}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      ))}

      {/* FAB con menu verticale glassmorphism - Solo Desktop */}
      <div className="fixed bottom-8 left-8 z-50 hidden lg:block">
        <div
          className={`flex flex-col items-start space-y-3 mb-3 transition-all duration-300 ${
            menuOpen
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          {/* Modifica Liste */}
          <button
            onClick={() => {
              setEditMode((prev) => !prev);
              setMenuOpen(false);
            }}
            className="flex items-center gap-3 bg-green-500/80 backdrop-blur-xl text-white px-5 py-3 rounded-xl border border-white/20 shadow-2xl hover:bg-green-500/90 hover:scale-105 transition-all"
          >
            <Pencil size={20} /> <span className="font-semibold">Modifica</span>
          </button>

          {/* Filtro ordinamento */}
          <div className="flex items-center gap-3 bg-yellow-500/80 backdrop-blur-xl text-white px-5 py-3 rounded-xl border border-white/20 shadow-2xl hover:bg-yellow-500/90 transition-all">
            <ListFilter size={20} />
            <select
              value={sortOption}
              onChange={(e) => {
                handleSortChange(e);
                setMenuOpen(false);
              }}
              className="bg-transparent text-white font-semibold text-sm border-none outline-none cursor-pointer"
            >
              <option value="created" className="text-black">
                Per Creazione
              </option>
              <option value="alphabetical" className="text-black">
                Alfabetico
              </option>
              <option value="completed" className="text-black">
                Per Completezza
              </option>
            </select>
          </div>

          {/* Cerca */}
          <button
            onClick={() => {
              setSearchOpen(true);
              setMenuOpen(false);
            }}
            className="flex items-center gap-3 bg-gray-600/80 backdrop-blur-xl text-white px-5 py-3 rounded-xl border border-white/20 shadow-2xl hover:bg-gray-600/90 hover:scale-105 transition-all"
            title="Cerca"
          >
            <Search size={20} />
            <span className="font-semibold">Cerca</span>
          </button>
        </div>

        {/* Bottone principale */}
        <button
          onClick={() => {
            setMenuOpen((prev) => {
              const next = !prev;
              if (!next) setEditMode(false);
              return next;
            });
          }}
          className={`w-16 h-16 flex items-center justify-center rounded-full backdrop-blur-xl text-white shadow-2xl border-2 border-white/30 transition-all duration-300 ${
            colorMap[listColor]
          } ${
            menuOpen ? "rotate-45 scale-110" : "rotate-0 scale-100"
          } hover:scale-105 relative z-10`}
        >
          <Plus size={32} strokeWidth={2.5} />
        </button>
      </div>

      {editedTodo && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            ref={modalRef}
            className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-6 rounded-xl border border-gray-200/50 dark:border-white/20 shadow-2xl w-80"
          >
            <h2 className="text-xl font-semibold mb-4">Modifica ToDo</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Titolo <span className="text-red-500">*</span></label>
              <input
                value={editedTodo.title}
                onChange={(e) =>
                  setEditedTodo({ ...editedTodo, title: e.target.value })
                }
                className="w-full px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all"
              />
            </div>

            <div className="mb-3 flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Quantità</label>
                <input
                  type="number"
                  value={editedTodo.quantity || ""}
                  onChange={(e) =>
                    setEditedTodo({ ...editedTodo, quantity: e.target.value ? parseInt(e.target.value) : null })
                  }
                  min="1"
                  placeholder="Es: 2"
                  className="w-full px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Unità</label>
                <input
                  type="text"
                  value={editedTodo.unit || ""}
                  onChange={(e) =>
                    setEditedTodo({ ...editedTodo, unit: e.target.value || null })
                  }
                  placeholder="Es: pz, kg"
                  className="w-full px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all"
                />
              </div>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              💡 Lascia vuoti per rimuovere la quantità
            </div>

            <div className="flex justify-between gap-3">
              <button
                onClick={() => setEditedTodo(null)}
                className="flex-1 px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-lg hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all"
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
          <div className="fixed inset-0 bg-black/30 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div
              ref={bulkModalRef}
              className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-6 rounded-xl border border-gray-200/50 dark:border-white/20 shadow-2xl w-80"
            >
              <h2 className="text-xl font-semibold mb-4">
                Elimina {selectedIds.length} ToDo?
              </h2>
              <p className="mb-6">Questa operazione è irreversibile.</p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowBulkConfirm(false)}
                  className="px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-lg hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all"
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

      {showMoveModal && todoToMove && (
        <MoveTodoModal
          isOpen={showMoveModal}
          onClose={() => {
            setShowMoveModal(false);
            setTodoToMove(null);
          }}
          todoTitle={todoToMove.title}
          currentListId={Number(id)}
          currentListName={listName}
          allLists={allLists}
          onMove={handleMoveTodo}
        />
      )}

      {showQuantityModal && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            ref={quantityModalRef}
            className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-6 rounded-xl border border-gray-200/50 dark:border-white/20 shadow-2xl w-80"
          >
            <h2 className="text-xl font-semibold mb-4">Aggiungi ToDo</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Titolo <span className="text-red-500">*</span></label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Es: Latte, Pane, Uova..."
                className="w-full px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all"
              />
            </div>

            <div className="mb-3 flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Quantità</label>
                <input
                  type="number"
                  value={quantityValue}
                  onChange={(e) => setQuantityValue(e.target.value)}
                  placeholder="Es: 2"
                  min="1"
                  className="w-full px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Unità</label>
                <input
                  type="text"
                  value={unitValue}
                  onChange={(e) => setUnitValue(e.target.value)}
                  placeholder="Es: pz, kg"
                  className="w-full px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all"
                />
              </div>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              💡 Lascia vuoti per creare una todo normale. Esempi unità: pz, kg, litri, cf, scatole
            </div>

            <div className="flex justify-between gap-3">
              <button
                onClick={() => {
                  setShowQuantityModal(false);
                  setQuantityValue("");
                  setUnitValue("");
                }}
                className="flex-1 px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-lg hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all"
              >
                Annulla
              </button>
              <button
                onClick={handleCreateTodo}
                className="flex-1 px-4 py-2 bg-blue-600/80 backdrop-blur-sm border border-blue-300/30 text-white rounded-lg hover:bg-blue-600/90 transition-all"
              >
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu di sorting - Solo Mobile */}
      {showSortMenu && (
        <div
          className="fixed inset-0 bg-black/30 dark:bg-black/40 backdrop-blur-sm flex items-end justify-center z-50 lg:hidden pb-20"
          onClick={closeSortMenu}
        >
          <div
            ref={sortMenuRef}
            className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl w-full rounded-t-3xl p-6 pb-8 border-t border-gray-200/50 dark:border-white/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4 text-center">Ordina per</h3>

            <div className="space-y-3">
              <button
                onClick={async () => {
                  await handleSortOptionSelect("created");
                  closeSortMenu();
                }}
                className={`w-full px-4 py-3 rounded-xl text-left transition-all ${
                  sortOption === "created"
                    ? "bg-blue-600 text-white"
                    : "bg-white/50 dark:bg-gray-800/50 hover:bg-white/70 dark:hover:bg-gray-800/70"
                }`}
              >
                Per Creazione
              </button>

              <button
                onClick={async () => {
                  await handleSortOptionSelect("alphabetical");
                  closeSortMenu();
                }}
                className={`w-full px-4 py-3 rounded-xl text-left transition-all ${
                  sortOption === "alphabetical"
                    ? "bg-blue-600 text-white"
                    : "bg-white/50 dark:bg-gray-800/50 hover:bg-white/70 dark:hover:bg-gray-800/70"
                }`}
              >
                Alfabetico
              </button>

              <button
                onClick={async () => {
                  await handleSortOptionSelect("completed");
                  closeSortMenu();
                }}
                className={`w-full px-4 py-3 rounded-xl text-left transition-all ${
                  sortOption === "completed"
                    ? "bg-blue-600 text-white"
                    : "bg-white/50 dark:bg-gray-800/50 hover:bg-white/70 dark:hover:bg-gray-800/70"
                }`}
              >
                Per Completezza
              </button>
            </div>

            <button
              onClick={closeSortMenu}
              className="w-full mt-4 px-4 py-3 bg-gray-300/50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-300/70 dark:hover:bg-gray-700/70 transition-all"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation - Solo Mobile */}
      <BottomNav
        showHome={true}
        showEdit={true}
        showSort={true}
        showSearch={true}
        editMode={editMode}
        sortOption={sortOption}
        onToggleEdit={() => setEditMode(!editMode)}
        onCycleSortOption={() => setShowSortMenu(true)}
        onSearch={() => setSearchOpen(true)}
        editTitle="Modifica ToDo"
      />

      <style>
        {`
          * {
            -webkit-tap-highlight-color: transparent;
          }
          
          .overflow-y-auto::-webkit-scrollbar {
            display: none;
          }
          
          .overflow-y-auto {
            scrollbar-width: none;
            -ms-overflow-style: none;
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
  onMove,
  editMode,
  selectedIds,
  setSelectedIds,
  isDragging,
  isShared,
  isOwner,
  currentUserId,
}: {
  todo: Todo;
  onCheck: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: () => void;
  onMove: () => void;
  editMode: boolean;
  selectedIds: number[];
  setSelectedIds: React.Dispatch<React.SetStateAction<number[]>>;
  isDragging: boolean;
  isShared: boolean;
  isOwner: boolean;
  currentUserId: number | null;
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging: isThisItemDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isThisItemDragging ? 'none' : transition,
    opacity: isThisItemDragging ? 0.5 : 1,
  };

  return (
    <SwipeableTodoItem
      onEdit={onEdit}
      label={todo.title}
      onDelete={() => onDelete(todo.id)}
      disabled={isDragging}
    >
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center justify-between bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg px-6 py-3 rounded-xl border border-gray-200/50 dark:border-white/20 shadow-lg text-xl font-semibold hover:bg-white/70 dark:hover:bg-gray-800/70 ${isThisItemDragging ? '' : 'transition-all'}`}
      >
        <div
          className={`flex items-center gap-3 ${
            todo.completed ? "line-through text-gray-400" : ""
          }`}
        >
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

          <button
            onClick={() => onCheck(todo.id)}
            className="text-green-600 hover:text-green-800 transition-colors"
          >
            <CheckSquare size={20} />
          </button>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate">{todo.title}</span>
              {todo.quantity && todo.unit && (
                <span className="flex-shrink-0 whitespace-nowrap px-2 py-0.5 bg-blue-500/20 dark:bg-blue-500/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                  {todo.quantity} {todo.unit}
                </span>
              )}
            </div>
            {/* Mostra badge solo se lista è condivisa e l'utente è diverso dall'utente corrente */}
            {(isShared || !isOwner) && currentUserId && (
              <>
                {todo.modified_by && todo.modified_by.id !== todo.created_by?.id && todo.modified_by.id !== currentUserId ? (
                  <span className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    Modificata da {todo.modified_by.full_name}
                  </span>
                ) : todo.created_by && todo.created_by.id !== currentUserId ? (
                  <span className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    Aggiunta da {todo.created_by.full_name}
                  </span>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none transition-colors select-none"
            title="Trascina"
          >
            ☰
          </span>

          {editMode && (
            <>
              <button
                onClick={onMove}
                className="p-1 bg-purple-500/20 backdrop-blur-sm rounded text-purple-600 hover:text-purple-700 hover:bg-purple-500/30 transition-all"
              >
                <ArrowRightLeft size={16} />
              </button>
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
