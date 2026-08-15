import React, { createContext, useContext, useEffect, useState } from "react";
import { resolveThemePreference, type ThemePreference } from "@shared/themePreference";

type Theme = ThemePreference;

interface ThemeContextType {
  theme: Theme;
  setTheme?: (theme: Theme) => void;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (switchable) {
      const stored = localStorage.getItem("theme");
      return stored === "light" || stored === "dark" || stored === "system" ? stored : defaultTheme;
    }
    return defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => root.classList.toggle("dark", resolveThemePreference(theme, media.matches) === "dark");
    applyTheme();

    if (switchable) {
      localStorage.setItem("theme", theme);
    }

    if (theme !== "system") return;
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme, switchable]);

  const toggleTheme = switchable
    ? () => {
        setTheme(prev => (resolveThemePreference(prev, window.matchMedia("(prefers-color-scheme: dark)").matches) === "light" ? "dark" : "light"));
      }
    : undefined;

  const updateTheme = switchable ? setTheme : undefined;

  return (
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
