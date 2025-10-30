import { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import { X, UserPlus, Trash2, Edit, Eye } from "lucide-react";
import { fetchFriends, Friendship } from "../api/friends";
import { getListShares, getCategoryShares, shareList, shareCategory, unshareList, unshareCategory, SharedUser } from "../api/sharing";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: number;
  itemName: string;
  itemType: "list" | "category";
  onShare?: () => void;
}

export default function ShareModal({ isOpen, onClose, itemId, itemName, itemType, onShare }: ShareModalProps) {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [sharedWith, setSharedWith] = useState<SharedUser[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<number | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
      // Animazione apertura
      if (modalRef.current && overlayRef.current) {
        gsap.fromTo(
          overlayRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.3, ease: "power2.out" }
        );
        gsap.fromTo(
          modalRef.current,
          { scale: 0.9, opacity: 0, y: 20 },
          { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.2)" }
        );
      }
    }
  }, [isOpen, itemId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [friendsData, sharesData] = await Promise.all([
        fetchFriends(),
        itemType === "list" ? getListShares(itemId) : getCategoryShares(itemId),
      ]);
      setFriends(friendsData);
      setSharedWith(sharesData);
    } catch (err) {
      setError("Errore nel caricamento dei dati");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!selectedFriendId) {
      setError("Seleziona un amico");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (itemType === "list") {
        await shareList(itemId, selectedFriendId, canEdit);
      } else {
        await shareCategory(itemId, selectedFriendId, canEdit);
      }
      setSelectedFriendId(null);
      setCanEdit(false);
      await loadData();
      if (onShare) onShare();
    } catch (err: any) {
      setError(err.message || "Errore durante la condivisione");
    } finally {
      setLoading(false);
    }
  };

  const handleUnshare = async (userId: number) => {
    if (!confirm("Rimuovere la condivisione?")) return;

    setLoading(true);
    setError(null);
    try {
      if (itemType === "list") {
        await unshareList(itemId, userId);
      } else {
        await unshareCategory(itemId, userId);
      }
      await loadData();
      if (onShare) onShare();
    } catch (err: any) {
      setError(err.message || "Errore durante la rimozione");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filtra amici già condivisi
  const availableFriends = friends.filter(
    (f) => !sharedWith.some((s) => s.user_id === f.friend.id)
  );

  return (
    <div ref={overlayRef} className="fixed inset-0 bg-black/30 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-xl border border-gray-200/50 dark:border-white/20 shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-white/20">
          <h2 className="text-xl font-bold">Condividi {itemType === "list" ? "Lista" : "Categoria"}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <strong className="text-gray-900 dark:text-white">{itemName}</strong>
          </div>

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Condividi con amici */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Condividi con un amico</h3>

            {availableFriends.length === 0 ? (
              <p className="text-sm text-gray-500">
                {friends.length === 0
                  ? "Non hai amici da aggiungere"
                  : "Già condiviso con tutti i tuoi amici"}
              </p>
            ) : (
              <>
                <select
                  value={selectedFriendId || ""}
                  onChange={(e) => setSelectedFriendId(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg border border-gray-200/50 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500/50 transition-all"
                  disabled={loading}
                >
                  <option value="">Seleziona un amico...</option>
                  {availableFriends.map((friendship) => (
                    <option key={friendship.friend.id} value={friendship.friend.id}>
                      {friendship.friend.full_name}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canEdit}
                    onChange={(e) => setCanEdit(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300"
                    disabled={loading}
                  />
                  <span className="text-sm">Permetti modifica</span>
                </label>

                <button
                  onClick={handleShare}
                  disabled={!selectedFriendId || loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600/80 hover:bg-blue-600/90 disabled:bg-gray-400/50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
                >
                  <UserPlus size={18} />
                  {loading ? "Condivisione..." : "Condividi"}
                </button>
              </>
            )}
          </div>

          {/* Lista utenti con cui è condiviso */}
          {sharedWith.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Condiviso con ({sharedWith.length})</h3>
              <div className="space-y-2">
                {sharedWith.map((share) => (
                  <div
                    key={share.user_id}
                    className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg rounded-lg border border-gray-200/50 dark:border-white/20"
                  >
                    <div className="flex items-center gap-3">
                      {share.profile_picture ? (
                        <img
                          src={share.profile_picture}
                          alt={share.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <span className="text-lg font-bold">
                            {share.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{share.full_name}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          {share.can_edit ? (
                            <>
                              <Edit size={12} /> Può modificare
                            </>
                          ) : (
                            <>
                              <Eye size={12} /> Solo visualizzazione
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnshare(share.user_id)}
                      disabled={loading}
                      className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                      title="Rimuovi condivisione"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
