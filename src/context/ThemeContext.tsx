import { createContext, useContext, useEffect, useState } from "react";
import { updateTheme } from "../api/auth";
import { getCurrentUserOfflineFirst } from "../services/offlineService";

interface ThemeContextProps {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  themeLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextProps>({
  theme: "light",
  setTheme: () => {},
  themeLoaded: false,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Initialize from localStorage for instant load, fallback to light
  const [theme, setThemeState] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" ? "dark" : "light";
  });
  const [themeLoaded, setThemeLoaded] = useState(false);

  // Apply theme class on initial render (before useEffect runs)
  useEffect(() => {
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(theme);
  }, []);

  useEffect(() => {
    const loadThemeFromBackend = async () => {
      const user = await getCurrentUserOfflineFirst();
      if (user?.theme) {
        setThemeState(user.theme);
        localStorage.setItem("theme", user.theme);
        document.documentElement.classList.remove("dark", "light");
        document.documentElement.classList.add(user.theme);
      }
      setThemeLoaded(true);
    };

    loadThemeFromBackend();

    // 🔁 Ricarica il tema anche al cambio di accessToken (nuovo login)
    const observer = new MutationObserver(loadThemeFromBackend);
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-access-token"] });

    return () => observer.disconnect();
  }, []);

  const setTheme = async (newTheme: "light" | "dark") => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);

    // ✅ Prima rimuovi sempre entrambe
    document.documentElement.classList.remove("dark", "light");
    // ✅ Poi aggiungi quella giusta
    document.documentElement.classList.add(newTheme);

    await updateTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);