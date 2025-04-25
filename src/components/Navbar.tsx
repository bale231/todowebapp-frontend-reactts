import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext"; // 👈 importa il context
// import { updateTheme } from "../api/auth";

interface NavbarProps {
  username?: string;
}


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

export default function Navbar({ username }: NavbarProps) {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <nav className="w-full sticky top-0 h-[80px] px-6 flex items-center justify-between bg-white dark:bg-gray-800 shadow z-50">
      <Link
        to="/home"
        className="text-xl font-bold text-blue-600 dark:text-blue-400"
      >
        <img
          src="https://webdesign-vito-luigi.it/appIcon/logo-todoapp.png"
          alt="ToDoApp Logo"
          width={300}
        />
      </Link>

      <div className="flex items-center gap-4">
        <ThemeToggle />

        {username ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              {username}
              <span className="text-xs">▼</span>
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
        ) : (
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
        )}
      </div>
    </nav>
  );
}
