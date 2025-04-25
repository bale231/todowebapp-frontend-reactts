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
  
      if (user?.theme) {
        document.documentElement.classList.toggle("dark", user.theme === "dark");
        setThemeState(user.theme);
      }
  
      setThemeLoaded(true);
    };
  
    loadThemeFromBackend();
  }, []);  
  
  const setTheme = async (newTheme: "light" | "dark") => {
    setThemeState(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    
    try {
      await updateTheme(newTheme);
    } catch (err) {
      console.error("Errore aggiornamento tema:", err);
    }
  };   

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);