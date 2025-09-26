// hooks/useNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast'; // o react-toastify

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'update' | 'maintenance' | 'feature' | 'general';
  is_read: boolean;
  created_at: string;
  commit_hash?: string;
}

interface NotificationPreferences {
  push_enabled: boolean;
  in_app_enabled: boolean;
  updates_enabled: boolean;
  has_push_subscription: boolean;
}

interface NotificationStats {
  unread_count: number;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push_enabled: true,
    in_app_enabled: true,
    updates_enabled: true,
    has_push_subscription: false
  });
  const [stats, setStats] = useState<NotificationStats>({ unread_count: 0 });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://bale231.pythonanywhere.com/api';

  // Ottieni token JWT dal localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  // Carica notifiche
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/notifications/`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [API_BASE]);

  // Carica statistiche (badge count)
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/notifications/stats/`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching notification stats:', error);
    }
  }, [API_BASE]);

  // Carica preferenze
  const fetchPreferences = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/notifications/preferences/`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  }, [API_BASE]);

  // Marca notifica come letta
  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(`${API_BASE}/notifications/${notificationId}/read/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: true }
              : notif
          )
        );
        fetchStats(); // Aggiorna contatore
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Marca tutte come lette
  const markAllAsRead = async () => {
    try {
      const response = await fetch(`${API_BASE}/notifications/mark-all-read/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, is_read: true }))
        );
        setStats({ unread_count: 0 });
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Elimina notifica
  const deleteNotification = async (notificationId: number) => {
    try {
      const response = await fetch(`${API_BASE}/notifications/${notificationId}/delete/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      if (response.ok) {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        fetchStats(); // Aggiorna contatore
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Aggiorna preferenze
  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const response = await fetch(`${API_BASE}/notifications/preferences/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(newPreferences),
      });
      
      if (response.ok) {
        setPreferences(prev => ({ ...prev, ...newPreferences }));
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  // Richiedi permesso push notifications
  const requestPushPermission = async (): Promise<boolean> => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      toast.error('Push notifications non supportate dal browser');
      return false;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      await subscribeToPush();
      return true;
    } else {
      toast.error('Permesso notifiche negato');
      return false;
    }
  };

  // Sottoscrivi push notifications
  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // VAPID public key - sostituisci con la tua!
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey
      });

      // Salva subscription sul server
      const response = await fetch(`${API_BASE}/notifications/push-subscription/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
              auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
            }
          }
        }),
      });

      if (response.ok) {
        setPreferences(prev => ({ ...prev, has_push_subscription: true, push_enabled: true }));
        toast.success('Push notifications attivate!');
      }
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Errore nell\'attivare le push notifications');
    }
  };

  // Disattiva push notifications
  const unsubscribeFromPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Rimuovi subscription dal server
      await fetch(`${API_BASE}/notifications/push-subscription/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      setPreferences(prev => ({ 
        ...prev, 
        has_push_subscription: false, 
        push_enabled: false 
      }));
      
      toast.success('Push notifications disattivate');
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast.error('Errore nel disattivare le push notifications');
    }
  };

  // Polling per nuove notifiche (opzionale)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, 30000); // Ogni 30 secondi

    return () => clearInterval(interval);
  }, [fetchStats]);

  // Carica dati iniziali
  useEffect(() => {
    fetchNotifications();
    fetchStats();
    fetchPreferences();
  }, [fetchNotifications, fetchStats, fetchPreferences]);

  return {
    // Data
    notifications,
    preferences,
    stats,
    loading,
    
    // Actions
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
    requestPushPermission,
    subscribeToPush,
    unsubscribeFromPush,
    
    // Refresh functions
    refreshNotifications: fetchNotifications,
    refreshStats: fetchStats,
    refreshPreferences: fetchPreferences,
  };
};