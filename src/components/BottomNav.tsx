import { Home, User, Pencil, ListFilter, Plus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface BottomNavProps {
  editMode: boolean;
  sortOption: "created" | "name" | "complete";
  onToggleEdit: () => void;
  onCycleSortOption: () => void;
  onAddList: () => void;
}

export default function BottomNav({
  editMode,
  sortOption,
  onToggleEdit,
  onCycleSortOption,
  onAddList,
}: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/home";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-t border-gray-200/50 dark:border-white/20 shadow-2xl">
        <div className="flex justify-around items-center px-4 py-3">
          {/* Home */}
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

          {/* Profilo */}
          <button
            onClick={() => navigate("/profile")}
            className="flex flex-col items-center gap-1 p-2 rounded-xl text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-all"
            title="Profilo"
          >
            <User size={24} />
            <span className="text-xs font-medium">Profilo</span>
          </button>

          {/* Aggiungi Lista - Centrale e più grande */}
          <button
            onClick={onAddList}
            className="flex items-center justify-center bg-blue-600 text-white w-14 h-14 rounded-full shadow-2xl hover:bg-blue-700 hover:scale-110 transition-all -mt-6"
            title="Nuova Lista"
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>

          {/* Modifica */}
          <button
            onClick={onToggleEdit}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              editMode
                ? "text-green-600 dark:text-green-400 scale-110"
                : "text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400"
            }`}
            title="Modifica Liste"
          >
            <Pencil size={24} strokeWidth={editMode ? 2.5 : 2} />
            <span className="text-xs font-medium">Modifica</span>
          </button>

          {/* Ordina */}
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
        </div>
      </div>
    </div>
  );
}
