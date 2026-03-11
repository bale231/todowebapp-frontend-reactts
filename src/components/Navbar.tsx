import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { RefreshCw } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { logout } from "../api/auth";
import { getCurrentUserOfflineFirst } from "../services/offlineService";
import { fullSync } from "../services/syncService";
import { getSyncQueue } from "../db/database";
import NotificationBadge from "./NotificationBadge";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "success" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProfilePicture = async () => {
      const user = await getCurrentUserOfflineFirst();
      if (user?.profile_picture) {
        setProfilePictureUrl(`https://bale231.pythonanywhere.com${user.profile_picture}`);
      } else {
        setProfilePictureUrl(null);
      }
    };
    fetchProfilePicture();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!dropdownRef.current) return;

    if (dropdownOpen) {
      gsap.fromTo(
        dropdownRef.current,
        { opacity: 0, y: -10, display: "none" },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          display: "block",
          ease: "power2.out",
        }
      );
    } else {
      gsap.to(dropdownRef.current, {
        opacity: 0,
        y: -10,
        duration: 0.2,
        ease: "power2.out",
        onComplete: () => {
          if (dropdownRef.current) dropdownRef.current.style.display = "none";
        },
      });
    }
  }, [dropdownOpen]);

  const { theme } = useTheme();

  const handleSync = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    setSyncStatus("idle");
    setSyncMessage(null);

    try {
      // Check pending items in queue
      const queue = await getSyncQueue();

      if (!navigator.onLine) {
        setSyncStatus("error");
        setSyncMessage(`Sei offline. ${queue.length} modifiche in attesa.`);
        return;
      }

      await fullSync();

      // Check if there are still items in queue after sync
      const remainingQueue = await getSyncQueue();

      if (remainingQueue.length > 0) {
        setSyncStatus("error");
        setSyncMessage(`${remainingQueue.length} modifiche non sincronizzate`);
      } else {
        setSyncStatus("success");
        setSyncMessage("Sincronizzato!");
      }
    } catch (error) {
      setSyncStatus("error");
      const msg = error instanceof Error ? error.message : "Errore di sync";
      setSyncMessage(msg);
    } finally {
      setIsSyncing(false);
      // Clear message after 3 seconds
      setTimeout(() => {
        setSyncStatus("idle");
        setSyncMessage(null);
      }, 3000);
    }
  };

  return (
    <nav className="w-full sticky top-0 h-[80px] pl-2 pr-6 flex items-center justify-between bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/20 shadow-lg z-50">
      <Link
        to="/home"
        className="text-xl font-bold text-blue-600 dark:text-blue-400"
      >
        {theme === "dark" ? (
          <img
            src="./assets/logo-themedark.png"
            alt="ToDoApp Logo"
            className="transition-opacity duration-500 ease-in-out"
            width={160}
          />
        ) : (
          <img
            src="./assets/logo-themelight.png"
            alt="ToDoApp Logo"
            className="transition-opacity duration-500 ease-in-out"
            width={160}
          />
        )}
      </Link>

      <div className="flex items-center gap-4">
        {/* Sync button */}
        <div className="relative">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`p-2 rounded-full transition-all duration-200 ${
              syncStatus === "success"
                ? "text-green-500 bg-green-100 dark:bg-green-900/30"
                : syncStatus === "error"
                ? "text-red-500 bg-red-100 dark:bg-red-900/30"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
            title="Sincronizza"
          >
            <RefreshCw
              className={`w-5 h-5 ${isSyncing ? "animate-spin" : ""}`}
            />
          </button>
          {/* Sync message tooltip */}
          {syncMessage && (
            <div
              className={`absolute top-full right-0 mt-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap shadow-lg z-50 ${
                syncStatus === "success"
                  ? "bg-green-500 text-white"
                  : "bg-red-500 text-white"
              }`}
            >
              {syncMessage}
            </div>
          )}
        </div>

        <ThemeToggle />

        {/* 🔔 BADGE NOTIFICHE */}
        <NotificationBadge />

        {/* Icona profilo - solo su desktop (lg:block) */}
        <div className="relative hidden lg:block">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="focus:outline-none"
          >
            {profilePictureUrl ? (
              <img
                src={profilePictureUrl}
                alt="User Profile"
                className="w-10 h-10 rounded-full border-2 border-gray-200 dark:border-gray-700 shadow-sm object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-gray-500 dark:text-gray-300"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
              </div>
            )}
          </button>

          <div
            ref={dropdownRef}
            style={{ display: "none" }}
            className="absolute right-0 mt-2 w-40 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/50 dark:border-white/20 rounded-lg shadow-2xl p-2 text-sm z-[100]"
          >
            <Link
              to="/profile"
              onClick={() => setDropdownOpen(false)}
              className="block px-3 py-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded transition"
            >
              Profilo
            </Link>

            <button
              onClick={() => {
                logout();
                navigate("/");
                window.location.reload();
              }}
              className="w-full text-left px-3 py-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}