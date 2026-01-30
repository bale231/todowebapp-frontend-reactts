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
  sortOption?: "created" | "name" | "complete";
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
  const hasAddButton = showAdd;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-t border-gray-200/50 dark:border-white/20 shadow-2xl">
        <div className={`flex ${buttonsCount <= 3 ? 'justify-center gap-8' : 'justify-around'} items-center px-4 py-3`}>
          {/* Home */}
          {showHome && (
            <button
              onClick={() => navigate("/home")}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                isHome
                  ? "text-blue-600 dark:text-blue-400 scale-110"
                  : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              }`}
              title="Home"
            >
              <Home size={24} strokeWidth={isHome ? 2.5 : 2} />
              <span className="text-xs font-medium">Home</span>
            </button>
          )}

          {/* Profilo */}
          {showProfile && (
            <button
              onClick={() => navigate("/profile")}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                isProfile
                  ? "text-purple-600 dark:text-purple-400 scale-110"
                  : "text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
              }`}
              title="Profilo"
            >
              <User size={24} strokeWidth={isProfile ? 2.5 : 2} />
              <span className="text-xs font-medium">Profilo</span>
            </button>
          )}

          {/* Aggiungi - Centrale e più grande se presente */}
          {showAdd && onAdd && (
            <button
              onClick={onAdd}
              className={`flex items-center justify-center bg-blue-600 text-white ${
                hasAddButton && buttonsCount > 3 ? 'w-14 h-14 -mt-6' : 'w-12 h-12'
              } rounded-full shadow-2xl hover:bg-blue-700 hover:scale-110 transition-all`}
              title={addTitle}
            >
              <Plus size={hasAddButton && buttonsCount > 3 ? 28 : 24} strokeWidth={2.5} />
            </button>
          )}

          {/* Modifica */}
          {showEdit && onToggleEdit && (
            <button
              onClick={onToggleEdit}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                editMode
                  ? "text-green-600 dark:text-green-400 scale-110"
                  : "text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400"
              }`}
              title={editTitle}
            >
              <Pencil size={24} strokeWidth={editMode ? 2.5 : 2} />
              <span className="text-xs font-medium">Modifica</span>
            </button>
          )}

          {/* Ordina */}
          {showSort && onCycleSortOption && (
            <button
              onClick={onCycleSortOption}
              className="flex flex-col items-center gap-1 p-2 rounded-xl text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-all"
              title={`Ordina: ${
                sortOption === "created"
                  ? "Più recente"
                  : sortOption === "name"
                  ? "Alfabetico"
                  : "Per completezza"
              }`}
            >
              <ListFilter size={24} />
              <span className="text-xs font-medium">Ordina</span>
            </button>
          )}

          {/* Cerca */}
          {showSearch && onSearch && (
            <button
              onClick={onSearch}
              className="flex flex-col items-center gap-1 p-2 rounded-xl text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
              title="Cerca"
            >
              <Search size={24} />
              <span className="text-xs font-medium">Cerca</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
