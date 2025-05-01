import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { getCurrentUserJWT } from "../api/auth";

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

export default function Navbar() {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
    <nav className="w-full sticky top-0 h-[80px] pl-2 pr-6 flex items-center justify-between bg-white dark:bg-gray-800 shadow z-50">
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

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="focus:outline-none"
          >
            {profilePictureUrl ? (
              <img
                src={profilePictureUrl}
                alt="User Profile"
                className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-700 shadow-sm object-cover"
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
            className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-700 rounded shadow-lg p-2 text-sm z-50"
          >
            <Link
              to="/profile"
              onClick={() => setDropdownOpen(false)}
              className="block px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition"
            >
              Profilo
            </Link>

            <button
              onMouseDown={(e) => {
                e.stopPropagation();
                document.cookie = "token=; Max-Age=0; path=/;";
                navigate("/");
              }}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}