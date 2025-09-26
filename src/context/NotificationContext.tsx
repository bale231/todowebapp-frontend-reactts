import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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

  const API_URL = "https://bale231.pythonanywhere.com/api";

  // Controlla i permessi notifiche all'avvio
  useEffect(() => {
    if ("Notification" in window) {
      setHasPermission(Notification.permission === "granted");
    }
  }, []);

  // Richiedi permessi notifiche browser
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

  // Fetch notifiche dal backend
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const res = await fetch(`${API_URL}/notifications/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Errore nel caricamento notifiche:", error);
    }
  };

  // Marca come letta
  const markAsRead = async (id: number) => {
    try {
      const token = localStorage.getItem("accessToken");
      await fetch(`${API_URL}/notifications/${id}/read/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error("Errore nel marcare come letta:", error);
    }
  };

  // Marca tutte come lette
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      await fetch(`${API_URL}/notifications/mark_all_read/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error("Errore nel marcare tutte come lette:", error);
    }
  };

  // Elimina notifica
  const deleteNotification = async (id: number) => {
    try {
      const token = localStorage.getItem("accessToken");
      await fetch(`${API_URL}/notifications/${id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    } catch (error) {
      console.error("Errore nell'eliminazione notifica:", error);
    }
  };

  // Polling ogni 30 secondi per nuove notifiche
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Mostra notifica browser quando arriva una nuova
  useEffect(() => {
    if (hasPermission && notifications.length > 0) {
      const lastNotif = notifications[0];
      if (!lastNotif.read) {
        new Notification(lastNotif.title, {
          body: lastNotif.message,
          icon: "/icon-192.png", // Aggiungi la tua icona
        });
      }
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