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

  useEffect(() => {
    const loadThemeFromBackend = async () => {
      const user = await getCurrentUserJWT();
      const userTheme = user?.theme === "dark" ? "dark" : "light";
  
      setThemeState(userTheme);
      document.documentElement.classList.remove("dark");
      if (userTheme === "dark") {
        document.documentElement.classList.add("dark");
      }
  
      setThemeLoaded(true);
    };
    loadThemeFromBackend();
  }, []);  
  
  const setTheme = async (newTheme: "light" | "dark") => {
    setThemeState(newTheme);
  
    // ✅ Rimuove e aggiunge esplicitamente
    document.documentElement.classList.remove("dark");
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    }
  
    await updateTheme(newTheme); // salva nel backend
  };  

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);