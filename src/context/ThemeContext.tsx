// src/context/ThemeContext.tsx
import { createContext, useContext, useState } from "react";

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

  const setTheme = (newTheme: "light" | "dark") => {
    setThemeState(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");

    // 🔥 Aggiorna anche il backend
    fetch("https://bale231.pythonanywhere.com/api/update-theme/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ theme: newTheme }),
    });
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