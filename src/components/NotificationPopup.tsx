import { useEffect, useRef } from "react";
import { useNotifications } from "../context/NotificationContext";
import gsap from "gsap";
import { X, Check, Trash2, RefreshCw, AlertCircle } from "lucide-react";

export default function NotificationPopup() {
  const {
    notifications,
    showPopup,
    setShowPopup,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const popupRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showPopup && popupRef.current && overlayRef.current) {
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.2 }
      );
      gsap.fromTo(
        popupRef.current,
        { x: 100, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, ease: "power2.out" }
      );
    } else if (!showPopup && popupRef.current && overlayRef.current) {
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.2,
      });
      gsap.to(popupRef.current, {
        x: 100,
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
      });
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
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        onClick={() => setShowPopup(false)}
        className="fixed inset-0 bg-black/30 dark:bg-black/40 backdrop-blur-sm z-40"
      />

      {/* Popup */}
      <div
        ref={popupRef}
        className="fixed top-20 right-4 w-96 max-h-[80vh] bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-white/20 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-white/20">
          <h3 className="text-lg font-semibold">Notifiche</h3>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={markAllAsRead}
                className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-lg transition"
                title="Segna tutte come lette"
              >
                <Check size={18} />
              </button>
            )}
            <button
              onClick={() => setShowPopup(false)}
              className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Lista notifiche */}
        <div className="flex-1 overflow-y-auto p-2">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nessuna notifica
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 mb-2 rounded-lg transition-all ${
                  notif.read
                    ? "bg-gray-100/50 dark:bg-gray-700/50"
                    : "bg-blue-50/50 dark:bg-blue-900/30 border-l-4 border-blue-500"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">{getNotificationIcon(notif.type)}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">
                        {notif.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {notif.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notif.created_at).toLocaleString("it-IT")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!notif.read && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="p-1 hover:bg-gray-200/50 dark:hover:bg-gray-600/50 rounded transition"
                        title="Segna come letta"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="p-1 hover:bg-red-100/50 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded transition"
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
    </>
  );
}