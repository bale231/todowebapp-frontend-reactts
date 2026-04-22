import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { Sparkles, Bug, Zap, X } from 'lucide-react';
import './UpdatePopup.css';

interface ChangelogEntry {
  type: 'new' | 'fix' | 'improvement';
  title: string;
  description: string;
}

interface Changelog {
  version: string;
  date: string;
  changes: ChangelogEntry[];
}

interface UpdatePopupProps {
  changelog: Changelog | null;
  onUpdateNow: () => void;
  onUpdateLater: () => void;
}

export default function UpdatePopup({ changelog, onUpdateNow, onUpdateLater }: UpdatePopupProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (overlayRef.current && modalRef.current) {
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
      gsap.fromTo(
        modalRef.current,
        { scale: 0.9, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.2)' }
      );
    }
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'new':
        return <Sparkles size={18} className="text-green-500" />;
      case 'fix':
        return <Bug size={18} className="text-red-500" />;
      case 'improvement':
        return <Zap size={18} className="text-yellow-500" />;
      default:
        return <Sparkles size={18} className="text-blue-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'new':
        return 'Novità';
      case 'fix':
        return 'Correzione';
      case 'improvement':
        return 'Miglioramento';
      default:
        return 'Aggiornamento';
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
    >
      <div
        ref={modalRef}
        className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-white/20 shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Aggiornamento App
              </h2>
              {changelog && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Versione {changelog.version}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onUpdateLater}
            className="p-2 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            È disponibile una nuova versione dell'app. Vuoi aggiornarla ora?
          </p>

          {changelog && changelog.changes.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Novità in questa versione:
              </h3>
              {changelog.changes.map((change, index) => (
                <div
                  key={index}
                  className="flex gap-3 p-3 rounded-lg bg-gray-100/50 dark:bg-gray-800/50"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getTypeIcon(change.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {change.title}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        change.type === 'new' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        change.type === 'fix' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {getTypeLabel(change.type)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {change.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200/50 dark:border-white/20 flex gap-3">
          <button
            onClick={onUpdateLater}
            className="flex-1 px-4 py-3 rounded-xl bg-gray-200/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Aggiorna in seguito
          </button>
          <button
            onClick={onUpdateNow}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
          >
            Aggiorna ora
          </button>
        </div>
      </div>
    </div>
  );
}
