import { useEffect, useRef } from "react";
import { useNotifications } from "../context/NotificationContext";
import { useUpdate } from "../context/UpdateContext";
import gsap from "gsap";
import { X, Check, Trash2, RefreshCw, AlertCircle, Download } from "lucide-react";

export default function NotificationPopup() {
  const {
    notifications,
    showPopup,
    setShowPopup,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();
  const { pendingUpdate, triggerUpdate, changelog, dismissPendingUpdate } = useUpdate();

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showPopup && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [showPopup]);

  if (!showPopup) return null;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "update_normal":
        return <RefreshCw size={20} className="text-blue-500" />;
      case "update_important":
        return <AlertCircle size={20} className="text-red-500" />;
      default:
        return <AlertCircle size={20} className="text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200/50 dark:border-white/20 p-6 rounded-xl shadow-2xl w-80 max-w-[90%] max-h-[70vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Notifiche</h3>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={markAllAsRead}
                className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition text-gray-700 dark:text-gray-300"
                title="Segna tutte come lette"
              >
                <Check size={18} />
              </button>
            )}
            <button
              onClick={() => setShowPopup(false)}
              className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition text-gray-700 dark:text-gray-300"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Lista notifiche */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {/* Update notification */}
          {pendingUpdate && (
            <div className="p-3 rounded-lg bg-gradient-to-r from-blue-50/80 to-purple-50/80 dark:from-blue-900/40 dark:to-purple-900/40 border-l-4 border-purple-500">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0">
                  <Download size={20} className="text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm mb-1 text-gray-900 dark:text-white">
                    Aggiornamento disponibile
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {changelog ? `Versione ${changelog.version}` : "Nuova versione disponibile"}
                  </p>
                  <button
                    onClick={triggerUpdate}
                    className="mt-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all"
                  >
                    Aggiorna ora
                  </button>
                </div>
                <button
                  onClick={dismissPendingUpdate}
                  className="p-1.5 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition text-gray-500 flex-shrink-0"
                  title="Ignora"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {notifications.length === 0 && !pendingUpdate ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <AlertCircle size={48} className="mx-auto mb-3 opacity-50" />
              <p>Nessuna notifica</p>
            </div>
          ) : notifications.length > 0 && (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 rounded-lg transition-all ${
                  notif.read
                    ? "bg-white/40 dark:bg-gray-800/40"
                    : "bg-blue-50/50 dark:bg-blue-900/30 border-l-4 border-blue-500"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-1 flex-shrink-0">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-1 text-gray-900 dark:text-white">
                        {notif.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 break-words">
                        {notif.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {new Date(notif.created_at).toLocaleString("it-IT")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!notif.read && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="p-1.5 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition text-gray-700 dark:text-gray-300"
                        title="Segna come letta"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="p-1.5 hover:bg-red-100/50 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition"
                      title="Elimina"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}