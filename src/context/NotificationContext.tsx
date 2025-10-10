import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { 
  fetchNotifications as fetchNotificationsAPI,
  markNotificationAsRead as markNotificationAsReadAPI,
  markAllNotificationsAsRead as markAllNotificationsAsReadAPI,
  deleteNotification as deleteNotificationAPI
} from "../api/notifications";

export interface Notification {
  id: number;
  type: "update_normal" | "update_important" | "friend_request" | "list_modified" | "general";
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  from_user?: {
    name: string;
    surname: string;
    profile_picture?: string;
  };
  list_name?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  showPopup: boolean;
  setShowPopup: (show: boolean) => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: number) => void;
  fetchNotifications: () => Promise<void>;
  requestPermission: () => Promise<void>;
  hasPermission: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  
  // ✅ Traccia le notifiche già mostrate
  const shownNotifications = useRef<Set<number>>(new Set());

  useEffect(() => {
    if ("Notification" in window) {
      setHasPermission(Notification.permission === "granted");
    }
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      console.log("Browser non supporta le notifiche");
      return;
    }

    if (Notification.permission === "granted") {
      setHasPermission(true);
      return;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      setHasPermission(permission === "granted");
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await fetchNotificationsAPI();
      setNotifications(data);
    } catch (error) {
      console.error("Errore nel caricamento notifiche:", error);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await markNotificationAsReadAPI(id);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error("Errore nel marcare come letta:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsReadAPI();
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error("Errore nel marcare tutte come lette:", error);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await deleteNotificationAPI(id);
      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
      // ✅ Rimuovi anche dal set delle notifiche mostrate
      shownNotifications.current.delete(id);
    } catch (error) {
      console.error("Errore nell'eliminazione notifica:", error);
    }
  };

  // Polling ogni 30 secondi (aumentato da 5 secondi)
  useEffect(() => {
    fetchNotifications();
  }, []);

  // ✅ Mostra notifica browser SOLO per notifiche NUOVE
  useEffect(() => {
    if (hasPermission && notifications.length > 0) {
      // Trova notifiche non lette che non abbiamo ancora mostrato
      const newUnreadNotifs = notifications.filter(
        (notif) => !notif.read && !shownNotifications.current.has(notif.id)
      );

      // Mostra solo le nuove notifiche
      newUnreadNotifs.forEach((notif) => {
        new Notification(notif.title, {
          body: notif.message,
          icon: "/logo192.png",
          tag: `notif-${notif.id}`, // Previene duplicati
        });
        
        // ✅ Segna come mostrata
        shownNotifications.current.add(notif.id);
      });
    }
  }, [notifications, hasPermission]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        showPopup,
        setShowPopup,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        fetchNotifications,
        requestPermission,
        hasPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};