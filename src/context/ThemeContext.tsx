import { createContext, useState, useEffect, useContext } from "react";

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
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      try {
        const res = await fetch(
          "https://bale231.pythonanywhere.com/api/jwt-user/",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        const userTheme = data.theme || "light";

        document.documentElement.classList.toggle("dark", userTheme === "dark");
        setThemeState(userTheme);
      } catch (err) {
        console.error("Errore nel fetch del tema", err);
      } finally {
        setThemeLoaded(true); // ✅ assicurati che venga comunque sbloccato
      }
    };

    fetchTheme();
  }, []);

  const setTheme = (newTheme: "light" | "dark") => {
    setThemeState(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");

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