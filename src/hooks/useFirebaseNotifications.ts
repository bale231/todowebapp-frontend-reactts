import { useEffect, useState } from "react";
import { messaging, getToken, onMessage, VAPID_KEY } from "../firebase/config";

export const useFirebaseNotifications = () => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === "granted") {
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        console.log("FCM Token:", token);
        setFcmToken(token);

        // Salva il token nel backend
        await fetch("https://bale231.pythonanywhere.com/api/notifications/save-fcm-token/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          body: JSON.stringify({ fcm_token: token }),
        });

        return token;
      }
    } catch (error) {
      console.error("Errore richiesta permessi:", error);
    }
    return null;
  };

  // Ascolta notifiche quando l'app è in foreground
  useEffect(() => {
    if (notificationPermission === "granted") {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log("Notifica ricevuta (foreground):", payload);
        
        // Mostra notifica anche in foreground
        if (payload.notification) {
          new Notification(payload.notification.title || "Notifica", {
            body: payload.notification.body,
            icon: "/logo192.png",
          });
        }
      });

      return () => unsubscribe();
    }
  }, [notificationPermission]);

  return { fcmToken, notificationPermission, requestPermission };
};