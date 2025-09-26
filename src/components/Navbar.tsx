import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { Sun, Moon, Bell, X, Check, CheckCheck, Trash2, Settings } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { getCurrentUserJWT } from "../api/auth";
import { logout } from "../api/auth";
import { useNotifications } from "../hooks/useNotifications";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="text-blue-600 dark:text-yellow-400 hover:scale-105 transition"
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, stats, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!dropdownRef.current) return;

    if (isOpen) {
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
  }, [isOpen]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'ora';
    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    return `${diffDays}g fa`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'update': return '🚀';
      case 'feature': return '✨';
      case 'maintenance': return '🔧';
      default: return '📢';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-blue-600 dark:text-yellow-400 hover:scale-105 transition focus:outline-none"
      >
        <Bell size={20} />
        {stats.unread_count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center text-[10px] font-bold">
            {stats.unread_count > 99 ? '99+' : stats.unread_count}
          </span>
        )}
      </button>

      <div
        ref={dropdownRef}
        style={{ display: "none" }}
        className="absolute right-0 mt-2 w-80 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border border-gray-200/50 dark:border-white/20 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h3 className="font-medium text-gray-900 dark:text-white">Notifiche</h3>
          <div className="flex items-center space-x-2">
            {stats.unread_count > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
              >
                <CheckCheck size={14} />
                Segna tutto
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-64 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <Bell size={32} className="mx-auto mb-2 opacity-50" />
              <p>Nessuna notifica</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-b border-gray-200/50 dark:border-gray-700/50 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors ${
                  !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {notification.title}
                      </h4>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {notification.message}
                    </p>
                    {notification.commit_hash && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-2">
                        Commit: {notification.commit_hash}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimeAgo(notification.created_at)}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-1 ml-2">
                    {!notification.is_read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        title="Segna come letto"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-1 text-red-600 hover:text-red-700 dark:text-red-400"
                      title="Elimina"
                    >
                      <Trash2 size={14} />
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

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

function NotificationSettings({ isOpen, onClose }: NotificationSettingsProps) {
  const { 
    preferences, 
    updatePreferences, 
    requestPushPermission, 
    unsubscribeFromPush 
  } = useNotifications();
  const [loading, setLoading] = useState(false);

  const handlePushToggle = async (enabled: boolean) => {
    setLoading(true);
    try {
      if (enabled) {
        await requestPushPermission();
      } else {
        await unsubscribeFromPush();
      }
    } catch (error) {
      console.error('Error toggling push notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200/50 dark:border-white/20 rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Impostazioni Notifiche
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Notifiche aggiornamenti */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell size={20} className="text-blue-500" />
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Aggiornamenti App
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Ricevi notifiche per nuovi aggiornamenti
                </p>
              </div>
            </div>
            <button
              onClick={() => updatePreferences({ updates_enabled: !preferences.updates_enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.updates_enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.updates_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Push notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell size={20} className="text-purple-500" />
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Push Notifications
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Ricevi notifiche anche quando l'app è chiusa
                </p>
              </div>
            </div>
            <button
              disabled={loading}
              onClick={() => handlePushToggle(!preferences.push_enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                preferences.push_enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.push_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProfilePicture = async () => {
      const user = await getCurrentUserJWT();
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

  return (
    <>
      <nav className="w-full sticky top-0 h-[80px] pl-2 pr-6 flex items-center justify-between bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/20 shadow-lg z-50">
        <Link
          to="/home"
          className="text-xl font-bold text-blue-600 dark:text-blue-400"
        >
          {theme === "dark" ? (
            <img
              src="https://webdesign-vito-luigi.it/appIcon/logo-themedark.png"
              alt="ToDoApp Logo"
              className="transition-opacity duration-500 ease-in-out"
              width={160}
            />
          ) : (
            <img
              src="https://webdesign-vito-luigi.it/appIcon/logo-themelight.png"
              alt="ToDoApp Logo"
              className="transition-opacity duration-500 ease-in-out"
              width={160}
            />
          )}
        </Link>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          
          {/* Campanella notifiche */}
          <NotificationBell />

          <div className="relative">
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
              className="absolute right-0 mt-2 w-40 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border border-gray-200/50 dark:border-white/20 rounded-lg shadow-lg p-2 text-sm z-50"
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
                  setShowNotificationSettings(true);
                  setDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded transition flex items-center gap-2"
              >
                <Settings size={16} />
                Notifiche
              </button>

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

      {/* Modal impostazioni notifiche */}
      <NotificationSettings 
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />
    </>
  );
}