// src/context/ThemeContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUserJWT, updateTheme } from "../api/auth";

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
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const [themeLoaded, setThemeLoaded] = useState(false);

  // Al primo load: prendi il tema dal backend
  useEffect(() => {
    const loadThemeFromBackend = async () => {
      const user = await getCurrentUserJWT();
      if (user?.theme) {
        setThemeState(user.theme);
        document.documentElement.classList.toggle("dark", user.theme === "dark");
      }
      setThemeLoaded(true);
    };
    loadThemeFromBackend();
  }, []);

  const setTheme = async (newTheme: "light" | "dark") => {
    setThemeState(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
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