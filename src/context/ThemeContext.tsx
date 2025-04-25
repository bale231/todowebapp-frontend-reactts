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
        setThemeState(user.theme);
        if (user.theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
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