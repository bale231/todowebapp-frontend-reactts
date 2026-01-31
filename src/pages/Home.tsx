/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUserJWT } from "../api/auth";
import Navbar from "../components/Navbar";
import gsap from "gsap";
import {
  Plus,
  Pencil,
  ListFilter,
  Trash,
  Edit,
  Users,
  UserPlus,
  UserCheck,
  Share2,
  Search,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { fetchAllLists, editList, deleteList, getSelectedCategory, saveSelectedCategory } from "../api/todos";
import SwipeableListItem from "../components/SwipeableListItem";
import { useThemeColor } from "../hooks/useThemeColor";
import NotificationPrompt from "../components/NotificationPrompt";
import AnimatedAlert from "../components/AnimatedAlert";
import ShareModal from "../components/ShareModal";
import BottomNav from "../components/BottomNav";
import SearchBar from "../components/SearchBar";
import SupportWidget from "../components/SupportWidget";

interface TodoList {
  id: number;
  name: string;
  color: string;
  created_at: string;
  todos: { id: number; text?: string; title?: string; completed: boolean }[];
  category?: Category | null;
  is_owner?: boolean;
  is_shared?: boolean;
  can_edit?: boolean;
  shared_by?: {
    id: number;
    username: string;
    full_name: string;
  } | null;
}

interface Category {
  id: number;
  name: string;
  is_owner?: boolean;
  is_shared?: boolean;
  can_edit?: boolean;
  shared_by?: {
    id: number;
    username: string;
    full_name: string;
  } | null;
}

const colorClasses: Record<string, string> = {
  blue: "border-l-blue-500 bg-blue-500/20 dark:bg-blue-500/20",
  green: "border-l-green-500 bg-green-500/20 dark:bg-green-500/20",
  yellow: "border-l-yellow-500 bg-yellow-500/20 dark:bg-yellow-500/20",
  red: "border-l-red-500 bg-red-500/20 dark:bg-red-500/20",
  purple: "border-l-purple-500 bg-purple-500/20 dark:bg-purple-500/20",
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [lists, setLists] = useState<TodoList[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [newListName, setNewListName] = useState("");
  const [newListColor, setNewListColor] = useState("blue");
  const [newListCategory, setNewListCategory] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editListId, setEditListId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(
    null
  );
  const [editMode, setEditMode] = useState(false);
  const [sortOption, setSortOption] = useState<"created" | "name" | "complete">(
    "created"
  );
  const [categorySortAlpha, setCategorySortAlpha] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState("");
  const [editCatId, setEditCatId] = useState<number | null>(null);
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareItemId, setShareItemId] = useState<number | null>(null);
  const [shareItemName, setShareItemName] = useState("");
  const [shareItemType, setShareItemType] = useState<"list" | "category">("list");

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const API_URL = "https://bale231.pythonanywhere.com/api";
  const navigate = useNavigate();
  const titleRef = useRef(null);
  const boxRef = useRef(null);
  const modalRef = useRef(null);
  const catModalRef = useRef(null);
  const scrollRestoredRef = useRef(false); // ✅ Track if scroll has been restored

  useThemeColor();

  // ✅ Helper function to get access token from both storages
  const getAccessToken = () => {
    return localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || "";
  };

  useEffect(() => {
    const loadUserAndPref = async () => {
      const resUser = await getCurrentUserJWT();
      if (!resUser) return navigate("/");
      setUser(resUser);

      try {
        const res = await fetch(`${API_URL}/lists/sort_order/`, {
          headers: {
            Authorization: `Bearer ${getAccessToken()}`,
          },
        });
        if (res.ok) {
          const { sort_order } = await res.json();
          setSortOption(
            sort_order === "alphabetical"
              ? "name"
              : sort_order === "complete"
              ? "complete"
              : "created"
          );
        }

        const catRes = await fetch(`${API_URL}/categories/sort_preference/`, {
          headers: {
            Authorization: `Bearer ${getAccessToken()}`,
          },
        });
        if (catRes.ok) {
          const { category_sort_alpha } = await catRes.json();
          setCategorySortAlpha(category_sort_alpha);
        }
      } catch (err) {
        console.error("Impossibile caricare preferenze:", err);
      }
    };
    loadUserAndPref();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchLists();
      fetchCategories();

      // ✅ Controlla se è la prima volta o un ritorno
      const isReturning = sessionStorage.getItem("homeScrollPosition");

      if (!hasAnimated && !isReturning) {
        gsap.from(titleRef.current, {
          y: -30,
          opacity: 0,
          duration: 0.8,
          ease: "power2.out",
        });
        gsap.from(boxRef.current, {
          opacity: 0,
          y: 20,
          delay: 0.2,
          duration: 0.8,
          ease: "power2.out",
        });
        setHasAnimated(true);
      }
    }
  }, [user, hasAnimated]);

  useEffect(() => {
    if (showForm && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [showForm]);

  useEffect(() => {
    if (showCatForm && catModalRef.current) {
      gsap.fromTo(
        catModalRef.current,
        { scale: 0.9, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.2)" }
      );
    }
  }, [showCatForm]);

  // Aggiungi questo useEffect dopo gli altri useEffect esistenti
  useEffect(() => {
    // Ripristina lo scroll solo UNA volta quando i dati sono pronti
    if (scrollRestoredRef.current) return; // Se già ripristinato, esci

    const savedScrollPosition = sessionStorage.getItem("homeScrollPosition");
    if (savedScrollPosition && lists.length > 0) { // Aspetta che ci siano liste
      // Usa requestAnimationFrame per aspettare che il browser finisca il rendering
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({
            top: parseInt(savedScrollPosition, 10),
            behavior: 'auto'
          });
          sessionStorage.removeItem("homeScrollPosition");
          scrollRestoredRef.current = true; // Segna come ripristinato
        });
      });
    }
  }, [lists, categories]);

  useEffect(() => {
    // Salva la posizione prima di lasciare la pagina
    const handleBeforeUnload = () => {
      sessionStorage.setItem("homeScrollPosition", window.scrollY.toString());
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const fetchLists = async () => {
    try {
      const data = await fetchAllLists();
      if (Array.isArray(data)) {
        setLists(data);
      } else {
        console.error("Formato risposta non valido:", data);
      }
    } catch (err) {
      console.error("Errore nel caricamento liste:", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/categories/`, {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);

        // Carica la categoria selezionata salvata
        await loadSelectedCategory(data);
      }
    } catch (err) {
      console.error("Errore caricamento categorie:", err);
    }
  };

  const loadSelectedCategory = async (categoriesData: Category[]) => {
    try {
      const result = await getSelectedCategory();
      if (result && result.selected_category !== null && result.selected_category !== undefined) {
        const cat = categoriesData.find((c) => c.id === result.selected_category);
        if (cat) {
          setSelectedCategory(cat);
        }
      }
    } catch (err) {
      console.error("Errore caricamento categoria selezionata:", err);
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      setAlert({ type: "warning", message: "Inserisci un nome per la lista" });
      return;
    }

    const payload = {
      name: newListName,
      color: newListColor,
      category: newListCategory,
    };

    try {
      if (editListId !== null) {
        await editList(editListId, newListName, newListColor, newListCategory);
        setAlert({
          type: "success",
          message: "Lista modificata con successo!",
        });
        setEditListId(null);
      } else {
        const res = await fetch(`${API_URL}/lists/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getAccessToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          setAlert({
            type: "error",
            message: "Errore nella creazione della lista",
          });
          return;
        }
        setAlert({ type: "success", message: "Lista creata con successo!" });
      }
      fetchLists();
      setNewListName("");
      setNewListColor("blue");
      setShowForm(false);
      setNewListCategory(null);
    } catch (err) {
      setAlert({ type: "error", message: "Errore di connessione" });
    }
  };

  const handleEditList = (list: TodoList) => {
    setEditListId(list.id);
    setNewListName(list.name);
    setNewListColor(list.color);
    setNewListCategory(list.category ? list.category.id : null);
    setShowForm(true);
  };

  const handleSortChange = async (newOpt: "created" | "name" | "complete") => {
    setSortOption(newOpt);
    const backendOrder =
      newOpt === "name"
        ? "alphabetical"
        : newOpt === "complete"
        ? "complete"
        : "created";

    const messages = {
      created: "Ordinamento: Più recente",
      name: "Ordinamento: Alfabetico",
      complete: "Ordinamento: Per completezza",
    };

    setAlert({ type: "success", message: messages[newOpt] });

    try {
      await fetch(`${API_URL}/lists/sort_order/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({ sort_order: backendOrder }),
      });
    } catch (err) {
      console.error("Errore salvataggio ordinamento:", err);
    }
  };

  const deleteListAsync = async (id: number) => {
    try {
      await deleteList(id);
      fetchLists();
      setShowDeleteConfirm(null);
      setAlert({ type: "success", message: "Lista eliminata" });
    } catch (err) {
      setAlert({ type: "error", message: "Errore nell'eliminazione" });
    }
  };

  const handleDeleteList = async (id: number) => {
    const cardEl = document.getElementById(`card-${id}`);
    if (cardEl) {
      gsap.fromTo(
        cardEl,
        { x: -3 },
        {
          x: 3,
          repeat: 2,
          yoyo: true,
          duration: 0.1,
          onComplete: () => {
            deleteListAsync(id);
          },
        }
      );
    } else {
      await deleteList(id);
      fetchLists();
      setShowDeleteConfirm(null);
      setAlert({ type: "success", message: "Lista eliminata" });
    }
  };

  const handleCreateOrEditCat = async () => {
    if (!catName.trim()) {
      setAlert({
        type: "warning",
        message: "Inserisci un nome per la categoria",
      });
      return;
    }

    const url = editCatId
      ? `${API_URL}/categories/${editCatId}/`
      : `${API_URL}/categories/`;
    const method = editCatId ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: catName }),
      });

      if (!res.ok) {
        setAlert({
          type: "error",
          message: "Errore nella gestione della categoria",
        });
        return;
      }

      fetchCategories();
      setShowCatForm(false);
      setEditCatId(null);
      setCatName("");
      setAlert({
        type: "success",
        message: editCatId ? "Categoria modificata!" : "Categoria creata!",
      });
    } catch (err) {
      setAlert({ type: "error", message: "Errore di connessione" });
    }
  };

  const handleEditCat = (cat: Category) => {
    setEditCatId(cat.id);
    setCatName(cat.name);
    setShowCatForm(true);
  };

  // Search and filter logic
  const searchFilteredLists = useMemo(() => {
    if (!searchQuery.trim()) return lists;

    const query = searchQuery.toLowerCase().trim();

    return lists.filter((list) => {
      // Check if list name matches
      if (list.name?.toLowerCase().includes(query)) return true;

      // Check if any todo in the list matches (support both text and title)
      if (list.todos && Array.isArray(list.todos)) {
        if (list.todos.some((todo) => {
          const todoText = todo.text || todo.title || "";
          return todoText.toLowerCase().includes(query);
        })) {
          return true;
        }
      }

      return false;
    });
  }, [lists, searchQuery]);

  // Apply category filter on top of search
  const filteredLists = selectedCategory
    ? searchFilteredLists.filter((l) => l.category && l.category.id === selectedCategory.id)
    : searchFilteredLists;

  // Get matching todos for each list (for highlighting in search results)
  const getMatchingTodos = useCallback(
    (list: TodoList) => {
      if (!searchQuery.trim()) return [];
      if (!list.todos || !Array.isArray(list.todos)) return [];
      const query = searchQuery.toLowerCase().trim();
      return list.todos.filter((todo) => {
        const todoText = todo.text || todo.title || "";
        return todoText.toLowerCase().includes(query);
      });
    },
    [searchQuery]
  );

  const sortedLists = [...filteredLists].sort((a, b) => {
    if (sortOption === "name") {
      return a.name.localeCompare(b.name);
    } else if (sortOption === "complete") {
      // Liste meno completate prima (da completare prima)
      const aComplete =
        a.todos.filter((t) => t.completed).length / (a.todos.length || 1);
      const bComplete =
        b.todos.filter((t) => t.completed).length / (b.todos.length || 1);
      return aComplete - bComplete;
    } else {
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
  });

  const groupedLists: { categoryName: string; lists: TodoList[] }[] = [];

  if (!selectedCategory) {
    const uncategorized = sortedLists.filter((l) => !l.category);
    if (uncategorized.length > 0) {
      groupedLists.push({
        categoryName: "Senza categoria",
        lists: uncategorized,
      });
    }

    const categoriesWithLists = categories
      .map((cat) => {
        const listsInCat = sortedLists.filter(
          (l) => l.category && l.category.id === cat.id
        );
        return { categoryName: cat.name, lists: listsInCat };
      })
      .filter((group) => group.lists.length > 0);

    if (categorySortAlpha) {
      categoriesWithLists.sort((a, b) =>
        a.categoryName.localeCompare(b.categoryName)
      );
    }

    groupedLists.push(...categoriesWithLists);
  } else {
    groupedLists.push({
      categoryName: selectedCategory.name,
      lists: sortedLists,
    });
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition">
      <Navbar />
      <NotificationPrompt />

      {alert && (
        <AnimatedAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="p-6 pb-24 lg:pb-6" ref={boxRef}>
        {/* Search Bar */}
        {searchOpen && (
          <div className="pt-4 mb-4">
            <SearchBar
              isOpen={searchOpen}
              onClose={() => setSearchOpen(false)}
              onSearch={setSearchQuery}
              placeholder="Cerca liste o todo..."
            />
          </div>
        )}

        {/* Prima riga: Pulsanti utenti a larghezza piena */}
        <div className={`grid grid-cols-3 gap-3 mb-4 ${searchOpen ? '' : 'pt-6'}`}>
          <button
            onClick={() => navigate("/users")}
            className="flex items-center justify-center gap-2 bg-blue-600/80 text-white py-3 px-4 rounded-xl border border-blue-300/30 shadow-lg hover:bg-blue-600/90 hover:scale-[1.02] transition-all"
            title="Trova Utenti"
          >
            <Users size={20} />
            <span className="text-sm font-medium hidden sm:inline">Utenti</span>
          </button>
          <button
            onClick={() => navigate("/friend-requests")}
            className="flex items-center justify-center gap-2 bg-green-600/80 text-white py-3 px-4 rounded-xl border border-green-300/30 shadow-lg hover:bg-green-600/90 hover:scale-[1.02] transition-all"
            title="Richieste"
          >
            <UserPlus size={20} />
            <span className="text-sm font-medium hidden sm:inline">Richieste</span>
          </button>
          <button
            onClick={() => navigate("/friends")}
            className="flex items-center justify-center gap-2 bg-purple-600/80 text-white py-3 px-4 rounded-xl border border-purple-300/30 shadow-lg hover:bg-purple-600/90 hover:scale-[1.02] transition-all"
            title="I Miei Amici"
          >
            <UserCheck size={20} />
            <span className="text-sm font-medium hidden sm:inline">Amici</span>
          </button>
        </div>

        {/* Seconda riga: Nuova Categoria + Cerca */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => {
              setShowCatForm(true);
              setEditCatId(null);
              setCatName("");
            }}
            className="flex items-center justify-center gap-2 bg-yellow-500/80 text-white py-3 px-4 rounded-xl font-medium shadow-lg hover:bg-yellow-500/90 hover:scale-[1.02] transition-all"
          >
            <Plus size={20} />
            <span className="text-sm font-medium">Nuova Categoria</span>
          </button>
          {!searchOpen && (
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center gap-2 bg-gray-600/80 text-white py-3 px-4 rounded-xl font-medium shadow-lg hover:bg-gray-600/90 hover:scale-[1.02] transition-all"
              title="Cerca"
            >
              <Search size={20} />
              <span className="text-sm font-medium">Cerca</span>
            </button>
          )}
          {searchOpen && (
            <button
              onClick={() => setSearchOpen(false)}
              className="flex items-center justify-center gap-2 bg-red-500/80 text-white py-3 px-4 rounded-xl font-medium shadow-lg hover:bg-red-500/90 hover:scale-[1.02] transition-all"
            >
              <X size={20} />
              <span className="text-sm font-medium">Chiudi Ricerca</span>
            </button>
          )}
        </div>

        {/* Seconda riga: Select categoria - centrato e allungato */}
        <div className="flex justify-center items-center gap-2 mb-6">
          <select
            value={selectedCategory?.id || ""}
            onChange={async (e) => {
              const id = Number(e.target.value);
              const cat = categories.find((c) => c.id === id) || null;
              setSelectedCategory(cat);

              // Salva la categoria selezionata nel backend
              try {
                await saveSelectedCategory(cat ? cat.id : null);
              } catch (err) {
                console.error("Errore salvataggio categoria selezionata:", err);
              }

              setAlert({
                type: "success",
                message: cat
                  ? `Filtro: ${cat.name}`
                  : "Filtro: Tutte le categorie",
              });
            }}
            className="bg-white/80 dark:bg-gray-800/80 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg w-full max-w-md text-center font-medium"
          >
            <option value="">Tutte le categorie</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {selectedCategory && (
            <button
              onClick={() => handleEditCat(selectedCategory)}
              className="bg-blue-200 dark:bg-blue-900 p-2 rounded-xl hover:bg-blue-300 dark:hover:bg-blue-800 transition shadow-lg"
              title="Modifica categoria"
            >
              <Pencil size={16} />
            </button>
          )}
        </div>

        {sortedLists.length === 0 && (
          <div className="mt-6 p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-white/20 rounded-xl shadow-lg">
            {searchQuery.trim() ? (
              <div className="text-center">
                <Search size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                <p className="text-lg text-gray-700 dark:text-gray-300">
                  Nessun risultato per "<span className="font-semibold">{searchQuery}</span>"
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Prova con un altro termine di ricerca
                </p>
              </div>
            ) : (
              <p className="text-lg text-gray-700 dark:text-gray-300 text-center">
                Qui andranno le tue liste ToDo animate
              </p>
            )}
          </div>
        )}

        <main className="flex-1 mt-8 mb-8 overflow-y-auto pr-2 pb-24">
          {groupedLists.map((group, groupIdx) => (
            <div key={groupIdx} className="mb-8">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
                {group.categoryName}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.lists.map((list) => {
                  const completed = list.todos.filter(
                    (t) => t.completed
                  ).length;
                  const pending = list.todos.length - completed;
                  const matchingTodos = getMatchingTodos(list);
                  const isSearching = searchQuery.trim().length > 0;

                  return (
                    <SwipeableListItem
                      key={list.id}
                      onEdit={() => handleEditList(list)}
                      onDelete={() => handleDeleteList(list.id)}
                      label={list.name}
                    >
                      <div
                        id={`card-${list.id}`}
                        className={`relative p-4 bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-white/20 rounded-xl shadow-lg border-l-4 min-h-[120px] flex flex-col justify-center ${
                          colorClasses[list.color]
                        } ${
                          editMode ? "animate-wiggle" : ""
                        } ${
                          isSearching && matchingTodos.length > 0
                            ? "ring-2 ring-blue-400/50"
                            : ""
                        } transition-all duration-200 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80`}
                      >
                        {/* Badge condivisa - Posizione assoluta per non interferire col layout */}
                        {list.is_shared && list.shared_by && (
                          <div className="absolute top-2 left-4 flex items-center gap-1 px-2 py-1 bg-purple-100/90 dark:bg-purple-900/90 rounded-md text-xs text-purple-700 dark:text-purple-300 z-20">
                            <Users size={12} />
                            <span>Condivisa da {list.shared_by.full_name}</span>
                          </div>
                        )}
                        <Link
                          onClick={() => {
                            // Salva la posizione di scroll corrente
                            sessionStorage.setItem(
                              "homeScrollPosition",
                              window.scrollY.toString()
                            );
                          }}
                          to={`/lists/${list.id}`}
                        >
                          <div className="cursor-pointer">
                            <h3 className="text-xl font-semibold mb-2">
                              {list.name}
                            </h3>
                            {list.todos.length === 0 ? (
                              <p className="text-sm text-gray-500">
                                Nessuna ToDo
                              </p>
                            ) : isSearching && matchingTodos.length > 0 ? (
                              // Show matching todos when searching
                              <div className="space-y-1">
                                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                  {matchingTodos.length} risultat{matchingTodos.length === 1 ? 'o' : 'i'} trovat{matchingTodos.length === 1 ? 'o' : 'i'}:
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {matchingTodos.slice(0, 3).map((todo) => (
                                    <span
                                      key={todo.id}
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        todo.completed
                                          ? "bg-green-100/80 text-green-700 dark:bg-green-900/80 dark:text-green-300 line-through"
                                          : "bg-blue-100/80 text-blue-700 dark:bg-blue-900/80 dark:text-blue-300"
                                      }`}
                                    >
                                      {todo.text || todo.title}
                                    </span>
                                  ))}
                                  {matchingTodos.length > 3 && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      +{matchingTodos.length - 3} altr{matchingTodos.length - 3 === 1 ? 'o' : 'i'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {pending} ToDo da completare, {completed}{" "}
                                completate.
                              </p>
                            )}
                          </div>
                        </Link>
                        {editMode && (
                          <div className="absolute top-8 right-2 flex gap-2 z-10">
                            {/* Pulsante condividi solo per liste di proprietà */}
                            {list.is_owner !== false && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShareItemId(list.id);
                                  setShareItemName(list.name);
                                  setShareItemType("list");
                                  setShareModalOpen(true);
                                }}
                                className="p-2 bg-purple-100/80 dark:bg-purple-900/80 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-200/80 dark:hover:bg-purple-800/80 transition-all"
                                title="Condividi lista"
                              >
                                <Share2 size={18} />
                              </button>
                            )}
                            {/* Pulsanti Edit e Delete solo per liste di proprietà */}
                            {list.is_owner !== false && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditList(list);
                                  }}
                                  className="p-2 bg-blue-100/80 dark:bg-blue-900/80 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-200/80 dark:hover:bg-blue-800/80 transition-all"
                                >
                                  <Edit size={18} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDeleteConfirm(list.id);
                                  }}
                                  className="p-2 bg-red-100/80 dark:bg-red-900/80 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-200/80 dark:hover:bg-red-800/80 transition-all"
                                >
                                  <Trash size={18} />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                        {showDeleteConfirm === list.id && (
                          <div className="mt-4 p-3 bg-red-500/20 rounded-lg border border-red-300/50">
                            <p className="text-red-600 dark:text-red-400 mb-2 text-sm font-medium">
                              Confermi eliminazione?
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteList(list.id);
                                }}
                                className="px-3 py-1 bg-red-600/80 text-white text-sm rounded-lg hover:bg-red-600 transition-all"
                              >
                                Sì
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteConfirm(null);
                                }}
                                className="px-3 py-1 bg-white/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 text-sm rounded-lg border border-gray-200/50 dark:border-white/20 hover:bg-white/70 dark:hover:bg-gray-700/70 transition-all"
                              >
                                No
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </SwipeableListItem>
                  );
                })}
              </div>
            </div>
          ))}
        </main>
      </div>

      {/* FAB con bottoni verticali verso l'alto - Solo Desktop */}
      <div className="fixed bottom-8 left-8 z-50 hidden lg:block">
        <div
          className={`flex flex-col items-start space-y-3 mb-3 transition-all duration-300 ${
            menuOpen
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          {/* Nuova Lista */}
          <button
            onClick={() => {
              setShowForm(true);
              setEditListId(null);
              setNewListName("");
              setNewListColor("blue");
              setNewListCategory(null);
              setMenuOpen(false);
            }}
            className="flex items-center gap-3 bg-blue-500/80 backdrop-blur-xl text-white px-5 py-3 rounded-xl border border-white/20 shadow-2xl hover:bg-blue-500/90 hover:scale-105 transition-all"
            title="Nuova Lista"
          >
            <Plus size={20} />{" "}
            <span className="font-semibold">Nuova Lista</span>
          </button>

          {/* Modifica Liste */}
          <button
            onClick={() => {
              const newMode = !editMode;
              setEditMode(newMode);
              setMenuOpen(false);
              setAlert({
                type: newMode ? "warning" : "success",
                message: newMode
                  ? "Modalità modifica attivata"
                  : "Modalità modifica disattivata",
              });
            }}
            className="flex items-center gap-3 bg-green-500/80 backdrop-blur-xl text-white px-5 py-3 rounded-xl border border-white/20 shadow-2xl hover:bg-green-500/90 hover:scale-105 transition-all"
            title="Modifica Liste"
          >
            <Pencil size={20} />{" "}
            <span className="font-semibold">Modifica Liste</span>
          </button>

          {/* Filtro ordinamento */}
          <button
            onClick={() => {
              const options: ("created" | "name" | "complete")[] = [
                "created",
                "name",
                "complete",
              ];
              const currentIndex = options.indexOf(sortOption);
              const nextIndex = (currentIndex + 1) % options.length;
              handleSortChange(options[nextIndex]);
              setMenuOpen(false);
            }}
            className="flex items-center gap-3 bg-yellow-500/80 backdrop-blur-xl text-white px-5 py-3 rounded-xl border border-white/20 shadow-2xl hover:bg-yellow-500/90 hover:scale-105 transition-all"
            title={`Ordina: ${
              sortOption === "created"
                ? "Più recente"
                : sortOption === "name"
                ? "Alfabetico"
                : "Per completezza"
            }`}
          >
            <ListFilter size={20} />
            <span className="font-semibold">
              {sortOption === "created"
                ? "Più recente"
                : sortOption === "name"
                ? "Alfabetico"
                : "Per completezza"}
            </span>
          </button>

          {/* Ordine alfabetico categorie */}
          {!selectedCategory && (
            <button
              onClick={async () => {
                const newValue = !categorySortAlpha;
                setCategorySortAlpha(newValue);
                setMenuOpen(false);

                setAlert({
                  type: "success",
                  message: newValue
                    ? "Ordine A-Z attivato"
                    : "Ordine A-Z disattivato",
                });

                try {
                  await fetch(`${API_URL}/categories/sort_preference/`, {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${getAccessToken()}`,
                    },
                    body: JSON.stringify({ category_sort_alpha: newValue }),
                  });
                } catch (err) {
                  console.error(
                    "Errore nel salvataggio preferenza categoria:",
                    err
                  );
                }
              }}
              className={`flex items-center gap-3 backdrop-blur-xl text-white px-5 py-3 rounded-xl border border-white/20 shadow-2xl hover:scale-105 transition-all ${
                categorySortAlpha
                  ? "bg-purple-500/80 hover:bg-purple-500/90"
                  : "bg-gray-600/80 hover:bg-gray-600/90"
              }`}
              title={
                categorySortAlpha ? "Ordine A-Z attivo" : "Ordine A-Z disattivo"
              }
            >
              <span className="text-lg font-bold">A-Z</span>
              <span className="font-semibold">
                {categorySortAlpha ? "Ordine A-Z attivo" : "Ordine A-Z"}
              </span>
            </button>
          )}

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
          className={`w-16 h-16 flex items-center justify-center rounded-full bg-blue-600/90 backdrop-blur-xl text-white shadow-2xl border-2 border-white/30 transition-all duration-300 ${
            menuOpen ? "rotate-45 scale-110" : "rotate-0 scale-100"
          } hover:scale-105 relative z-10`}
        >
          <Plus size={32} strokeWidth={2.5} />
        </button>
      </div>

      {/* Modale creazione/modifica lista */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            ref={modalRef}
            className="bg-white/70 dark:bg-gray-900/70 border border-gray-200/50 dark:border-white/20 p-6 rounded-xl shadow-2xl w-80"
          >
            <h2 className="text-xl font-semibold mb-4">
              {editListId !== null ? "Modifica Lista" : "Nuova Lista"}
            </h2>
            <input
              type="text"
              placeholder="Nome della lista"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="w-full px-4 py-2 bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-white/20 rounded-lg mb-3 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all"
            />
            <select
              value={newListColor}
              onChange={(e) => setNewListColor(e.target.value)}
              className="w-full px-4 py-2 bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-white/20 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all"
            >
              <option value="blue">Blu</option>
              <option value="green">Verde</option>
              <option value="yellow">Giallo</option>
              <option value="red">Rosso</option>
              <option value="purple">Viola</option>
            </select>
            <select
              value={newListCategory || ""}
              onChange={(e) =>
                setNewListCategory(
                  e.target.value ? Number(e.target.value) : null
                )
              }
              className="w-full px-4 py-2 bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-white/20 rounded-lg mb-4"
            >
              <option value="">Senza categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <div className="flex justify-between gap-3">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditListId(null);
                  setNewListName("");
                  setNewListColor("blue");
                  setNewListCategory(null);
                }}
                className="flex-1 px-4 py-2 bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-white/20 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all"
              >
                Annulla
              </button>
              <button
                onClick={handleCreateList}
                className="flex-1 px-4 py-2 bg-blue-600/80 border border-blue-300/30 text-white rounded-lg hover:bg-blue-600/90 transition-all"
              >
                {editListId !== null ? "Salva" : "Crea"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale categorie */}
      {showCatForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div ref={catModalRef} className="bg-white/70 dark:bg-gray-900/70 border border-gray-200/50 dark:border-white/20 p-6 rounded-xl shadow-2xl w-80">
            <h2 className="text-xl font-semibold mb-4">
              {editCatId ? "Modifica Categoria" : "Nuova Categoria"}
            </h2>
            <input
              type="text"
              placeholder="Nome categoria"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="w-full px-4 py-2 bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-white/20 rounded-lg mb-4"
            />
            <div className="flex justify-between gap-3">
              <button
                onClick={() => {
                  setShowCatForm(false);
                  setEditCatId(null);
                  setCatName("");
                }}
                className="flex-1 px-4 py-2 bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-white/20 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all"
              >
                Annulla
              </button>
              <button
                onClick={handleCreateOrEditCat}
                className="flex-1 px-4 py-2 bg-blue-600/80 border border-blue-300/30 text-white rounded-lg hover:bg-blue-600/90 transition-all"
              >
                {editCatId ? "Salva" : "Crea"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Condivisione */}
      {shareModalOpen && shareItemId && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setShareItemId(null);
          }}
          itemId={shareItemId}
          itemName={shareItemName}
          itemType={shareItemType}
          onShare={() => {
            fetchLists();
            fetchCategories();
          }}
        />
      )}

      {/* Support Widget */}
      <SupportWidget />

      {/* Bottom Navigation - Solo Mobile */}
      <BottomNav
        showHome={true}
        showProfile={true}
        showAdd={true}
        showEdit={true}
        showSort={true}
        editMode={editMode}
        sortOption={sortOption}
        onToggleEdit={() => {
          const newMode = !editMode;
          setEditMode(newMode);
          setAlert({
            type: newMode ? "warning" : "success",
            message: newMode
              ? "Modalità modifica attivata"
              : "Modalità modifica disattivata",
          });
        }}
        onCycleSortOption={() => {
          const options: ("created" | "name" | "complete")[] = [
            "created",
            "name",
            "complete",
          ];
          const currentIndex = options.indexOf(sortOption);
          const nextIndex = (currentIndex + 1) % options.length;
          handleSortChange(options[nextIndex]);
        }}
        onAdd={() => {
          setShowForm(true);
          setEditListId(null);
          setNewListName("");
          setNewListColor("blue");
          setNewListCategory(null);
        }}
        addTitle="Nuova Lista"
        editTitle="Modifica Liste"
      />

      <style>
        {`
        @keyframes wiggle {
          0% { transform: rotate(-0.5deg);}
          50% { transform: rotate(0.5deg);}
          100% { transform: rotate(-0.5deg);}
        }
        .animate-wiggle {
          animation: wiggle 0.3s ease-in-out infinite;
        }

        /* Rimuovi tutte le scrollbar */
        * {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE e Edge */
        }

        *::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
          width: 0;
          height: 0;
        }

        /* Mantieni lo scrolling ma nascondi la barra */
        .overflow-y-auto {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .overflow-y-auto::-webkit-scrollbar {
          display: none;
        }

        /* Disabilita l'evidenziazione touch su mobile */
        * {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
        }
      `}
      </style>
    </div>
  );
}
