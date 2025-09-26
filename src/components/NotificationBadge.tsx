import { Bell } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";
import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function NotificationBadge() {
  const { unreadCount, showPopup, setShowPopup } = useNotifications();
  const badgeRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(unreadCount);

  // Animazione quando cambia il numero
  useEffect(() => {
    if (badgeRef.current && unreadCount > prevCountRef.current) {
      gsap.fromTo(
        badgeRef.current,
        { scale: 1 },
        {
          scale: 1.3,
          duration: 0.2,
          ease: "power2.out",
          yoyo: true,
          repeat: 1,
        }
      );
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  return (
    <button
      onClick={() => setShowPopup(!showPopup)}
      className="relative text-blue-600 dark:text-yellow-400 hover:scale-105 transition"
    >
      <Bell size={24} />
      
      {unreadCount > 0 && (
        <div
          ref={badgeRef}
          className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-pulse"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </div>
      )}
    </button>
  );
}