import { Home, User, Pencil, ListFilter, Plus, Search } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface BottomNavProps {
  // Mostra solo i bottoni necessari per ogni pagina
  showHome?: boolean;
  showProfile?: boolean;
  showAdd?: boolean;
  showEdit?: boolean;
  showSort?: boolean;
  showSearch?: boolean;

  // Props opzionali per funzionalità
  editMode?: boolean;
  sortOption?: "created" | "alphabetical" | "complete" | "completed";
  onToggleEdit?: () => void;
  onCycleSortOption?: () => void;
  onAdd?: () => void;
  onSearch?: () => void;
  addTitle?: string; // Titolo personalizzato per il bottone add
  editTitle?: string; // Titolo personalizzato per il bottone edit
}

export default function BottomNav({
  showHome = false,
  showProfile = false,
  showAdd = false,
  showEdit = false,
  showSort = false,
  showSearch = false,
  editMode = false,
  sortOption = "created",
  onToggleEdit,
  onCycleSortOption,
  onAdd,
  onSearch,
  addTitle = "Aggiungi",
  editTitle = "Modifica",
}: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/home";
  const isProfile = location.pathname === "/profile";

  // Conta quanti bottoni vengono mostrati per gestire lo spacing
  const buttonsCount = [showHome, showProfile, showAdd, showEdit, showSort, showSearch].filter(Boolean).length;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Safe area padding for notched devices */}
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200/50 dark:border-white/10 shadow-2xl pb-safe">
        <div className={`flex ${buttonsCount <= 3 ? 'justify-center gap-12' : 'justify-around'} items-end px-2 pt-2 pb-3`}>
          {/* Home */}
          {showHome && (
            <button
              onClick={() => {
                if (isHome) {
                  // Se già sulla home, scroll to top con effetto smooth
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  navigate("/home");
                }
              }}
              className={`flex flex-col items-center gap-0.5 min-w-[64px] py-1.5 rounded-2xl transition-all active:scale-95 ${
                isHome
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
              title="Home"
            >
              <div className={`p-2 rounded-2xl transition-all ${isHome ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}>
                <Home size={28} strokeWidth={isHome ? 2.5 : 2} />
              </div>
              <span className={`text-xs font-semibold ${isHome ? 'text-blue-600 dark:text-blue-400' : ''}`}>Home</span>
            </button>
          )}

          {/* Profilo */}
          {showProfile && (
            <button
              onClick={() => navigate("/profile")}
              className={`flex flex-col items-center gap-0.5 min-w-[64px] py-1.5 rounded-2xl transition-all active:scale-95 ${
                isProfile
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
              title="Profilo"
            >
              <div className={`p-2 rounded-2xl transition-all ${isProfile ? 'bg-purple-100 dark:bg-purple-900/50' : ''}`}>
                <User size={28} strokeWidth={isProfile ? 2.5 : 2} />
              </div>
              <span className={`text-xs font-semibold ${isProfile ? 'text-purple-600 dark:text-purple-400' : ''}`}>Profilo</span>
            </button>
          )}

          {/* Aggiungi - FAB centrale più prominente */}
          {showAdd && onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center justify-center bg-blue-600 text-white w-16 h-16 -mt-8 rounded-full shadow-xl shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all border-4 border-white dark:border-gray-900"
              title={addTitle}
            >
              <Plus size={32} strokeWidth={2.5} />
            </button>
          )}

          {/* Modifica */}
          {showEdit && onToggleEdit && (
            <button
              onClick={onToggleEdit}
              className={`flex flex-col items-center gap-0.5 min-w-[64px] py-1.5 rounded-2xl transition-all active:scale-95 ${
                editMode
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
              title={editTitle}
            >
              <div className={`p-2 rounded-2xl transition-all ${editMode ? 'bg-green-100 dark:bg-green-900/50' : ''}`}>
                <Pencil size={28} strokeWidth={editMode ? 2.5 : 2} />
              </div>
              <span className={`text-xs font-semibold ${editMode ? 'text-green-600 dark:text-green-400' : ''}`}>Modifica</span>
            </button>
          )}

          {/* Ordina */}
          {showSort && onCycleSortOption && (
            <button
              onClick={onCycleSortOption}
              className="flex flex-col items-center gap-0.5 min-w-[64px] py-1.5 rounded-2xl text-gray-500 dark:text-gray-400 transition-all active:scale-95"
              title={`Ordina: ${
                sortOption === "created"
                  ? "Più recente"
                  : sortOption === "alphabetical"
                  ? "Alfabetico"
                  : "Per completezza"
              }`}
            >
              <div className="p-2 rounded-2xl">
                <ListFilter size={28} />
              </div>
              <span className="text-xs font-semibold">Ordina</span>
            </button>
          )}

          {/* Cerca */}
          {showSearch && onSearch && (
            <button
              onClick={onSearch}
              className="flex flex-col items-center gap-0.5 min-w-[64px] py-1.5 rounded-2xl text-gray-500 dark:text-gray-400 transition-all active:scale-95"
              title="Cerca"
            >
              <div className="p-2 rounded-2xl">
                <Search size={28} />
              </div>
              <span className="text-xs font-semibold">Cerca</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
