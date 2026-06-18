"use client";
// FILE: components/ThemeContext.tsx
// Global light/dark theme. Default is LIGHT (white background).
// Persists to localStorage so choice survives navigation.

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";
interface ThemeCtx { theme: Theme; toggle: () => void; }
const ThemeContext = createContext<ThemeCtx>({ theme: "light", toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("abraxas_theme") as Theme | null;
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("abraxas_theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle: () => setTheme(t => t === "light" ? "dark" : "light") }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext); }

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} aria-label="Toggle theme"
      style={{ padding:"0.4rem 0.75rem", borderRadius:20,
                border:"1px solid var(--border)", background:"var(--surface)",
                color:"var(--text-secondary)",
                fontFamily:"'Inter',system-ui,sans-serif",
                fontSize:"0.72rem", fontWeight:600, cursor:"pointer",
                display:"flex", alignItems:"center", gap:"0.375rem" }}>
      {theme === "light" ? "☾ Dark" : "○ Light"}
    </button>
  );
}
