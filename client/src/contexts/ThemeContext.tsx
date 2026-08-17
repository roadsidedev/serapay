import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { resolveThemePreference, type ThemePreference } from "@shared/themePreference";

type Theme = ThemePreference;

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({ children, defaultTheme = "system", switchable = true }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    const stored = window.localStorage.getItem("theme");
    return stored === "light" || stored === "dark" || stored === "system" ? stored : defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const resolved = resolveThemePreference(theme, media.matches);
      root.classList.toggle("dark", resolved === "dark");
      root.dataset.theme = resolved;
      root.style.colorScheme = resolved;
    };

    applyTheme();
    if (switchable) window.localStorage.setItem("theme", theme);
    if (theme !== "system") return;
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme, switchable]);

  const toggleTheme = useMemo(() => () => {
    setTheme(current => current === "dark" ? "light" : current === "light" ? "dark" : "dark");
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, switchable }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
