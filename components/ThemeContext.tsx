"use client";
// FILE: components/ThemeContext.tsx
// Light mode is removed for now, dark only, after repeated contrast
// bugs that weren't worth the risk to keep chasing. This file is kept
// (rather than deleted) so the CSS variables every component already
// references still resolve to something, removing it entirely would
// require touching every file that uses var(--text-primary) etc.
// Forces dark unconditionally, including for anyone who previously
// toggled to light and has that saved in their browser already.

import { createContext, useContext, useEffect, ReactNode } from "react";

interface ThemeCtx { theme: "dark"; }
const ThemeContext = createContext<ThemeCtx>({ theme: "dark" });

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    // Clear any previously stored light preference so it can't override this
    localStorage.removeItem("abraxas_theme");
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext); }
