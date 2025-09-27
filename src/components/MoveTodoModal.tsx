import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { X, ArrowRight } from 'lucide-react';

interface MoveTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  todoTitle: string;
  currentListId: number;
  currentListName: string;
  allLists: { id: number; name: string; color: string }[];
  onMove: (newListId: number) => void;
}

export default function MoveTodoModal({
  isOpen,
  onClose,
  todoTitle,
  currentListId,
  currentListName,
  allLists,
  onMove,
}: MoveTodoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);

  // Lista filtrata (escludi lista corrente)
  const availableLists = allLists.filter(list => list.id !== currentListId);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [isOpen]);

  const handleMove = () => {
    if (selectedListId) {
      onMove(selectedListId);
      onClose();
    }
  };

  if (!isOpen) return null;

  const colorClasses: Record<string, string> = {
    blue: 'border-l-blue-500 bg-blue-500/10',
    green: 'border-l-green-500 bg-green-500/10',
    yellow: 'border-l-yellow-500 bg-yellow-500/10',
    red: 'border-l-red-500 bg-red-500/10',
    purple: 'border-l-purple-500 bg-purple-500/10',
  };

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200/50 dark:border-white/20 p-6 rounded-xl shadow-2xl w-96 max-w-[90%] max-h-[70vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Sposta Todo
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition text-gray-700 dark:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Todo info */}
        <div className="mb-4 p-3 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Stai spostando:</p>
          <p className="font-semibold text-gray-900 dark:text-white">{todoTitle}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Da: <span className="font-medium">{currentListName}</span>
          </p>
        </div>

        {/* Lista destinazioni */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Seleziona lista di destinazione:</p>
          
          {availableLists.length === 0 ? (
            <p className="text-center text-gray-500 py-4">Nessun'altra lista disponibile</p>
          ) : (
            availableLists.map((list) => (
              <button
                key={list.id}
                onClick={() => setSelectedListId(list.id)}
                className={`w-full p-3 rounded-lg border-l-4 transition-all text-left ${
                  colorClasses[list.color] || 'border-l-gray-500 bg-gray-500/10'
                } ${
                  selectedListId === list.id
                    ? 'ring-2 ring-blue-500 bg-opacity-30'
                    : 'hover:bg-opacity-20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white">{list.name}</span>
                  {selectedListId === list.id && (
                    <ArrowRight size={18} className="text-blue-500" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Bottoni azione */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-white/20 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all"
          >
            Annulla
          </button>
          <button
            onClick={handleMove}
            disabled={!selectedListId}
            className={`flex-1 px-4 py-2 backdrop-blur-sm rounded-lg transition-all ${
              selectedListId
                ? 'bg-blue-600/80 border border-blue-300/30 text-white hover:bg-blue-600/90'
                : 'bg-gray-300/50 border border-gray-200/50 text-gray-500 cursor-not-allowed'
            }`}
          >
            Sposta
          </button>
        </div>
      </div>
    </div>
  );
}