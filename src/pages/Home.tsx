import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUserJWT } from "../api/auth";
import Navbar from "../components/Navbar";
import gsap from "gsap";
import { Plus, Pencil, ListFilter, Trash, Edit } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchAllLists, editList, deleteList } from "../api/todos";
import { useTheme } from "../context/ThemeContext";

interface TodoList {
  id: number;
  name: string;
  color: string;
  created_at: string;
  todos: { id: number; text: string; completed: boolean }[];
}

const colorClasses: Record<string, string> = {
  blue: "border-blue-500",
  green: "border-green-500",
  yellow: "border-yellow-500",
  red: "border-red-500",
  purple: "border-purple-500",
};

export default function Home() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  const { themeLoaded } = useTheme();
  const [lists, setLists] = useState<TodoList[]>([]);
  const [newListName, setNewListName] = useState("");
  const [newListColor, setNewListColor] = useState("blue");
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
  // url API
  const API_URL = "https://bale231.pythonanywhere.com/api";
  const navigate = useNavigate();
  const titleRef = useRef(null);
  const boxRef = useRef(null);
  const modalRef = useRef(null);

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
          // mappa da backend → frontend
          setSortOption(
            sort_order === "alphabetical" ? "name"
            : sort_order === "complete"     ? "complete"
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
      gsap.from(titleRef.current, {
        y: -50,
        opacity: 0,
        duration: 1,
        ease: "power2.out",
      });
      gsap.from(boxRef.current, {
        opacity: 0,
        y: 40,
        delay: 0.4,
        duration: 1,
        ease: "power2.out",
      });
    }
  }, [user]);

  useEffect(() => {
    if (showForm && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "power2.out" }
      );
    }
  }, [showForm]);

  useEffect(() => {
    gsap.fromTo(
      "#list-wrapper",
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
    );
  }, [sortOption]);

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
      // ✅ MODIFICA LISTA
      await editList(editListId, newListName, newListColor);
      setEditListId(null);
    } else {
      // ✅ CREA LISTA
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

  const handleSortChange = async (
    newOpt: "created" | "name" | "complete"
  ) => {
    setSortOption(newOpt);
  
    // Mappatura interna → backend
    const backendOrder =
      newOpt === "name" ? "alphabetical" :
      newOpt === "complete" ? "complete" :
      "created";
  
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
      { x: -5 },
      {
        x: 5,
        repeat: 3,
        yoyo: true,
        duration: 0.1,
        onComplete: () => {
          (async () => {
            await deleteList(id);
            fetchLists();
            setShowDeleteConfirm(null);
          })();
        }      
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

  if (!themeLoaded || !user) return null;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition relative">
      <Navbar />
      <div className="p-6" ref={boxRef}>
        <h1 ref={titleRef} className="text-xl sm:text-3xl font-bold">
          Ciao {user.username} 👋!! Crea le tue prime Liste e organizza il tuo tempo nel modo giusto!
        </h1>
        {Array.isArray(sortedLists) && sortedLists.length === 0 && (
          <p className="mt-2 text-lg text-gray-700 dark:text-gray-300">
            Qui andranno le tue liste ToDo animate 💫
          </p>
        )}

        <div
          id="list-wrapper"
          className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto max-h-[70vh] invisible-scrollbar"
        >
          {Array.isArray(sortedLists) && sortedLists.map((list) => {
            const completed = list.todos.filter((t) => t.completed).length;
            const pending = list.todos.length - completed;

            return (
              <div
                key={list.id}
                id={`card-${list.id}`}
                className={`relative p-4 bg-white dark:bg-gray-800 rounded shadow border-l-4 ${
                  colorClasses[list.color]
                } ${editMode ? "animate-wiggle" : ""}`}
              >
                {/* Contenuto cliccabile */}
                <Link to={`/lists/${list.id}`}>
                  <div className="cursor-pointer">
                    <h3 className="text-xl font-semibold mb-2">{list.name}</h3>
                    {list.todos.length === 0 ? (
                      <p className="text-sm text-gray-500">Nessuna ToDo</p>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {pending} ToDo {list.name} da completare, {completed}{" "}
                        completate.
                      </p>
                    )}
                  </div>
                </Link>

                {/* Bottoni Modifica/Elimina */}
                {editMode && (
                  <div className="absolute top-2 right-2 flex gap-2 z-10">
                    <button
                      onClick={() => handleEditList(list)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit size={25} />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(list.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash size={25} />
                    </button>
                  </div>
                )}

                {/* Conferma eliminazione */}
                {showDeleteConfirm === list.id && (
                  <div className="mt-4 text-lg">
                    <p className="text-red-500 mb-2">Confermi eliminazione?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteList(list.id)}
                        className="px-2 py-1 bg-red-600 text-white text-lg rounded"
                      >
                        Sì
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="px-2 py-1 bg-gray-300 text-xs rounded"
                      >
                        No
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating action button menu */}
      <div className="fixed bottom-6 left-6 z-50">
        <div
          className={`flex flex-col items-start space-y-2 mb-2 transition-all ${
            menuOpen
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 pointer-events-none"
          }`}
        >
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
          >
            <Plus size={18} /> Nuova Lista
          </button>
          <button
            onClick={() => setEditMode((prev) => !prev)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700"
          >
            <Pencil size={18} /> Modifica Liste
          </button>
          <div className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded shadow hover:bg-yellow-600">
            <ListFilter size={18} />
            <select
              value={sortOption}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onChange={(e) => handleSortChange(e.target.value as any)}
              className="bg-transparent text-[black] text-sm"
            >
              <option value="created">Più recente</option>
              <option value="name">Alfabetico</option>
              <option value="complete">Per completezza</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`w-14 h-14 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform duration-300 ${
            menuOpen ? "rotate-45" : ""
          }`}
        >
          <Plus size={28} />
        </button>
      </div>

      {/* Modal creazione/modifica lista */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            ref={modalRef}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg w-80"
          >
            <h2 className="text-xl font-semibold mb-4">
              {editListId !== null ? "Modifica Lista" : "Nuova Lista"}
            </h2>
            <input
              type="text"
              placeholder="Nome della lista"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="w-full px-4 py-2 border rounded mb-3 dark:bg-gray-700 dark:text-white"
            />
            <select
              value={newListColor}
              onChange={(e) => setNewListColor(e.target.value)}
              className="w-full px-4 py-2 border rounded mb-4 dark:bg-gray-700 dark:text-white"
            >
              <option value="blue">Blu</option>
              <option value="green">Verde</option>
              <option value="yellow">Giallo</option>
              <option value="red">Rosso</option>
              <option value="purple">Viola</option>
            </select>
            <div className="flex justify-between">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditListId(null);
                  setNewListName("");
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 dark:bg-gray-600 dark:text-white"
              >
                Annulla
              </button>
              <button
                onClick={handleCreateList}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
            0% { transform: rotate(-1deg); }
            50% { transform: rotate(1deg); }
            100% { transform: rotate(-1deg); }
          }
          .animate-wiggle {
            animation: wiggle 0.3s ease-in-out infinite;
          }
        `}
      </style>
    </div>
  );
}
