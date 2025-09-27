import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUserJWT } from "../api/auth";
import Navbar from "../components/Navbar";
import gsap from "gsap";
import { Plus, Pencil, ListFilter, Trash, Edit, Users, UserPlus, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchAllLists, editList, deleteList } from "../api/todos";
import SwipeableListItem from "../components/SwipeableListItem";
import { useThemeColor } from "../hooks/useThemeColor";

interface TodoList {
  id: number;
  name: string;
  color: string;
  created_at: string;
  todos: { id: number; text: string; completed: boolean }[];
}

const colorClasses: Record<string, string> = {
  blue: "border-l-blue-500 bg-blue-500/20 dark:bg-blue-500/20",
  green: "border-l-green-500 bg-green-500/20 dark:bg-green-500/20",
  yellow: "border-l-yellow-500 bg-yellow-500/20 dark:bg-yellow-500/20",
  red: "border-l-red-500 bg-red-500/20 dark:bg-red-500/20",
  purple: "border-l-purple-500 bg-purple-500/20 dark:bg-purple-500/20",
};

export default function Home() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  const [lists, setLists] = useState<TodoList[]>([]);
  const [newListName, setNewListName] = useState("");
  const [newListColor, setNewListColor] = useState("blue");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editListId, setEditListId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [sortOption, setSortOption] = useState<"created" | "name" | "complete">("created");
  const [hasAnimated, setHasAnimated] = useState(false);
  
  const API_URL = "https://bale231.pythonanywhere.com/api";
  const navigate = useNavigate();
  const titleRef = useRef(null);
  const boxRef = useRef(null);
  const modalRef = useRef(null);

  // 🎨 Hook per ripristinare il theme-color di default nella home
  useThemeColor();

  useEffect(() => {
    const loadUserAndPref = async () => {
      const resUser = await getCurrentUserJWT();
      if (!resUser) return navigate("/");
      setUser(resUser);

      try {
        const res = await fetch(`${API_URL}/lists/sort_order/`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
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
      } catch (err) {
        console.error("Impossibile caricare preference ordinamento:", err);
      }
    };
    loadUserAndPref();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchLists();
      
      if (!hasAnimated) {
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

  const handleCreateList = async () => {
    if (!newListName.trim()) return;

    if (editListId !== null) {
      await editList(editListId, newListName, newListColor);
      setEditListId(null);
    } else {
      const res = await fetch(`${API_URL}/lists/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newListName, color: newListColor }),
      });
      if (!res.ok) console.error("Errore creazione lista");
    }

    fetchLists();
    setNewListName("");
    setShowForm(false);
  };

  const handleEditList = (list: TodoList) => {
    setEditListId(list.id);
    setNewListName(list.name);
    setNewListColor(list.color);
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

    try {
      await fetch(`${API_URL}/lists/sort_order/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({ sort_order: backendOrder }),
      });
    } catch (err) {
      console.error("Errore nel salvataggio ordinamento liste:", err);
    }
  };

  const handleDeleteList = async (id: number) => {
    gsap.fromTo(
      `#card-${id}`,
      { x: -3 },
      {
        x: 3,
        repeat: 2,
        yoyo: true,
        duration: 0.1,
        onComplete: () => {
          (async () => {
            await deleteList(id);
            fetchLists();
            setShowDeleteConfirm(null);
          })();
        },
      }
    );
  };

  const sortedLists = [...lists].sort((a, b) => {
    if (sortOption === "name") {
      return a.name.localeCompare(b.name);
    } else if (sortOption === "complete") {
      const aComplete =
        a.todos.filter((t) => t.completed).length / (a.todos.length || 1);
      const bComplete =
        b.todos.filter((t) => t.completed).length / (b.todos.length || 1);
      return bComplete - aComplete;
    } else {
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
  });

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
      <div className="p-6" ref={boxRef}>
        <h1 ref={titleRef} className="text-xl sm:text-3xl font-bold">
          Ciao {user.username}! Crea le tue prime Liste e organizza il tuo
          tempo nel modo giusto!
        </h1>

          {/* Bottoni per navigare alle pagine amicizie */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 pt-6">
            <button
              onClick={() => navigate("/users")}
              className="flex items-center justify-center gap-2 bg-blue-600/80 backdrop-blur-md text-white px-4 py-3 rounded-xl border border-blue-300/30 shadow-lg hover:bg-blue-600/90 transition-all"
            >
              <Users size={20} />
              <span className="font-semibold">Trova Utenti</span>
            </button>

            <button
              onClick={() => navigate("/friend-requests")}
              className="flex items-center justify-center gap-2 bg-green-600/80 backdrop-blur-md text-white px-4 py-3 rounded-xl border border-green-300/30 shadow-lg hover:bg-green-600/90 transition-all"
            >
              <UserPlus size={20} />
              <span className="font-semibold">Richieste</span>
            </button>

            <button
              onClick={() => navigate("/friends")}
              className="flex items-center justify-center gap-2 bg-purple-600/80 backdrop-blur-md text-white px-4 py-3 rounded-xl border border-purple-300/30 shadow-lg hover:bg-purple-600/90 transition-all"
            >
              <UserCheck size={20} />
              <span className="font-semibold">I Miei Amici</span>
            </button>
          </div>

        {sortedLists.length === 0 && (
          <div className="mt-6 p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-white/20 rounded-xl shadow-lg">
            <p className="text-lg text-gray-700 dark:text-gray-300 text-center">
              Qui andranno le tue liste ToDo animate
            </p>
          </div>
        )}
        <main className="flex-1 mt-8 mb-8 overflow-y-auto max-h-[60vh] pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedLists.map((list) => {
              const completed = list.todos.filter((t) => t.completed).length;
              const pending = list.todos.length - completed;

              return (
                <SwipeableListItem
                  key={list.id}
                  onEdit={() => handleEditList(list)}
                  onDelete={() => handleDeleteList(list.id)} 
                  label={""}
                >
                  <div
                    id={`card-${list.id}`}
                    className={`relative p-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-white/20 rounded-xl shadow-lg border-l-4 ${
                      colorClasses[list.color]
                    } ${editMode ? "animate-wiggle" : ""} transition-all duration-200 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80`}
                  >
                    <Link to={`/lists/${list.id}`}>
                      <div className="cursor-pointer">
                        <h3 className="text-xl font-semibold mb-2">
                          {list.name}
                        </h3>
                        {list.todos.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            Nessuna ToDo
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {pending} ToDo da completare, {completed} completate.
                          </p>
                        )}
                      </div>
                    </Link>

                    {editMode && (
                      <div className="absolute top-2 right-2 flex gap-2 z-10">
                        <button
                          onClick={() => handleEditList(list)}
                          className="p-2 bg-blue-100/80 dark:bg-blue-900/80 backdrop-blur-sm rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-200/80 dark:hover:bg-blue-800/80 transition-all"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(list.id)}
                          className="p-2 bg-red-100/80 dark:bg-red-900/80 backdrop-blur-sm rounded-lg text-red-600 dark:text-red-400 hover:bg-red-200/80 dark:hover:bg-red-800/80 transition-all"
                        >
                          <Trash size={18} />
                        </button>
                      </div>
                    )}

                    {showDeleteConfirm === list.id && (
                      <div className="mt-4 p-3 bg-red-500/20 backdrop-blur-sm rounded-lg border border-red-300/50">
                        <p className="text-red-600 dark:text-red-400 mb-2 text-sm font-medium">
                          Confermi eliminazione?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeleteList(list.id)}
                            className="px-3 py-1 bg-red-600/80 backdrop-blur-sm text-white text-sm rounded-lg hover:bg-red-600 transition-all"
                          >
                            Sì
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="px-3 py-1 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-700 dark:text-gray-300 text-sm rounded-lg border border-gray-200/50 dark:border-white/20 hover:bg-white/70 dark:hover:bg-gray-700/70 transition-all"
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
        </main>
      </div>

      {/* Floating action button menu */}
      <div className="fixed bottom-6 left-6 z-50">
        <div
          className={`flex flex-col items-start space-y-2 mb-2 transition-all duration-200 ${
            menuOpen
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 pointer-events-none"
          }`}
        >
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600/80 backdrop-blur-md text-white px-4 py-2 rounded-xl border border-blue-300/30 shadow-lg hover:bg-blue-600/90 transition-all"
          >
            <Plus size={18} /> Nuova Lista
          </button>
          <button
            onClick={() => setEditMode((prev) => !prev)}
            className="flex items-center gap-2 bg-green-600/80 backdrop-blur-md text-white px-4 py-2 rounded-xl border border-green-300/30 shadow-lg hover:bg-green-600/90 transition-all"
          >
            <Pencil size={18} /> Modifica Liste
          </button>
          <div className="flex items-center gap-2 bg-yellow-500/80 backdrop-blur-md text-white px-4 py-2 rounded-xl border border-yellow-300/30 shadow-lg hover:bg-yellow-500/90 transition-all">
            <ListFilter size={18} />
            <select
              value={sortOption}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onChange={(e) => handleSortChange(e.target.value as any)}
              className="bg-transparent text-black text-sm"
            >
              <option value="created">Più recente</option>
              <option value="name">Alfabetico</option>
              <option value="complete">Per completezza</option>
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
          className={`w-14 h-14 flex items-center justify-center rounded-full bg-blue-600/80 backdrop-blur-md text-white shadow-lg border border-blue-300/30 transition-all duration-200 ${
            menuOpen ? "rotate-45" : ""
          } hover:bg-blue-600/90`}
        >
          <Plus size={28} />
        </button>
      </div>

      {/* Modal creazione/modifica lista */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            ref={modalRef}
            className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200/50 dark:border-white/20 p-6 rounded-xl shadow-2xl w-80"
          >
            <h2 className="text-xl font-semibold mb-4">
              {editListId !== null ? "Modifica Lista" : "Nuova Lista"}
            </h2>
            <input
              type="text"
              placeholder="Nome della lista"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="w-full px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-lg mb-3 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all"
            />
            <select
              value={newListColor}
              onChange={(e) => setNewListColor(e.target.value)}
              className="w-full px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all"
            >
              <option value="blue">Blu</option>
              <option value="green">Verde</option>
              <option value="yellow">Giallo</option>
              <option value="red">Rosso</option>
              <option value="purple">Viola</option>
            </select>
            <div className="flex justify-between gap-3">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditListId(null);
                  setNewListName("");
                }}
                className="flex-1 px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all"
              >
                Annulla
              </button>
              <button
                onClick={handleCreateList}
                className="flex-1 px-4 py-2 bg-blue-600/80 backdrop-blur-sm border border-blue-300/30 text-white rounded-lg hover:bg-blue-600/90 transition-all"
              >
                {editListId !== null ? "Salva" : "Crea"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wiggle animation style */}
      <style>
        {`
          @keyframes wiggle {
            0% { transform: rotate(-0.5deg); }
            50% { transform: rotate(0.5deg); }
            100% { transform: rotate(-0.5deg); }
          }
          .animate-wiggle {
            animation: wiggle 0.3s ease-in-out infinite;
          }
        `}
      </style>
    </div>
  );
}