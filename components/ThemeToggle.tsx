"use client";
// FILE: components/ThemeToggle.tsx
// Compact sun/moon toggle for the top nav.

import { useTheme } from "@/components/ThemeContext";

const S = "'Inter',system-ui,-apple-system,sans-serif";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--surface-raised)",
        color: "var(--text-secondary)",
        cursor: "pointer",
        flexShrink: 0,
        marginLeft: "0.5rem",
      }}
    >
      <span style={{ fontSize: "1rem", lineHeight: 1 }}>
        {isDark ? "\u2600" : "\u263E"}
      </span>
      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          fontFamily: S,
          fontSize: "0.65rem",
        }}
      >
        {isDark ? "Light" : "Dark"}
      </span>
    </button>
  );
}
