import { createContext, useState, useEffect, useContext } from "react";
import { getCurrentUserJWT, updateTheme as updateThemeAPI } from "../api/auth";

interface ThemeContextProps {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  themeLoaded: boolean;
  setThemeLoaded: (loaded: boolean) => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  theme: "light",
  setTheme: () => {},
  themeLoaded: false,
  setThemeLoaded: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    const fetchTheme = async () => {
      const user = await getCurrentUserJWT();
      if (!user) return;

      const userTheme = user.theme || "light";
      setThemeState(userTheme);
      document.documentElement.classList.toggle("dark", userTheme === "dark");
      setThemeLoaded(true);
    };

    fetchTheme();
  }, []);

  const setTheme = (newTheme: "light" | "dark") => {
    setThemeState(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    updateThemeAPI(newTheme); // 🔁 aggiorna il backend
  };

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, themeLoaded, setThemeLoaded }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);
