import { useEffect, useState, useRef } from "react";
import { Bell, X } from "lucide-react";
import { useFirebaseNotifications } from "../hooks/useFirebaseNotifications";
import gsap from "gsap";

export default function NotificationPrompt() {
  const [show, setShow] = useState(false);
  const { requestPermission } = useFirebaseNotifications();
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const answered = localStorage.getItem("notification_prompt_answered");
    
    if (!answered && "Notification" in window) {
      setTimeout(() => setShow(true), 2000);
    }
  }, []);

  // Animazione apertura
  useEffect(() => {
    if (show && modalRef.current && overlayRef.current) {
      // Animazione overlay
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" }
      );

      // Animazione modale stile Apple
      gsap.fromTo(
        modalRef.current,
        { 
          scale: 0.9,
          opacity: 0,
          y: 20
        },
        { 
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "back.out(1.2)"
        }
      );
    }
  }, [show]);

  const closeModal = () => {
    if (modalRef.current && overlayRef.current) {
      // Animazione chiusura
      gsap.to(modalRef.current, {
        scale: 0.9,
        opacity: 0,
        y: 20,
        duration: 0.3,
        ease: "power2.in"
      });

      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => setShow(false)
      });
    }
  };

  const handleAllow = async () => {
    try {
      await requestPermission();
      
      // Aggiorna preferenze backend
      await fetch("https://bale231.pythonanywhere.com/api/notifications/preferences/", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || ""}`,
        },
        body: JSON.stringify({ push_notifications_enabled: true }),
      });
      
      localStorage.setItem("notification_prompt_answered", "true");
      closeModal(); // ✅ Usa closeModal invece di setShow(false)
    } catch (error) {
      console.error("Errore permessi notifiche:", error);
      closeModal(); // ✅ Chiudi anche in caso di errore
    }
  };

  const handleDeny = () => {
    localStorage.setItem("notification_prompt_answered", "true");
    closeModal(); // ✅ Usa closeModal invece di setShow(false)
  };

  if (!show) return null;

  return (
    <div 
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Bell size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold">Abilita le notifiche</h3>
          </div>
          <button onClick={handleDeny} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Vuoi ricevere notifiche per richieste di amicizia, modifiche alle liste condivise e aggiornamenti?
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={handleDeny}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
          >
            Non ora
          </button>
          <button
            onClick={handleAllow}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            Consenti
          </button>
        </div>
      </div>
    </div>
  );
}