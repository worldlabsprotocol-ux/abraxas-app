"use client";
// FILE: components/redesign/ui.tsx
// Redesign primitives: Button + StatTile. Dark premium, framer-motion
// micro-interactions, reduced-motion safe.

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode, CSSProperties } from "react";
import { AnimatedCounter } from "@/lib/motion/AnimatedCounter";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface BtnProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  newTab?: boolean;
  style?: CSSProperties;
}

export function Btn({
  children, onClick, href, variant = "primary", size = "md",
  fullWidth = false, newTab = false, style,
}: BtnProps) {
  const reduce = useReducedMotion();
  const pad = size === "sm" ? "0.5rem 1rem" : size === "lg" ? "0.95rem 1.75rem" : "0.7rem 1.3rem";
  const fs  = size === "sm" ? "0.78rem" : size === "lg" ? "0.95rem" : "0.86rem";

  const base: CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
    width: fullWidth ? "100%" : undefined,
    padding: pad, borderRadius: 999, fontFamily: FONT, fontSize: fs, fontWeight: 700,
    letterSpacing: "-0.01em", cursor: "pointer", textDecoration: "none",
    whiteSpace: "nowrap", willChange: "transform", ...style,
  };

  const skin: CSSProperties =
    variant === "primary"
      ? { background: ACCENT, color: "#04130C", border: "none", boxShadow: "0 0 0 1px rgba(16,185,129,0.3), 0 10px 30px rgba(16,185,129,0.25)" }
      : variant === "secondary"
      ? { background: "transparent", color: "var(--text-primary)", border: "1px solid var(--border)" }
      : { background: "transparent", color: "var(--text-secondary)", border: "none" };

  const hover = reduce ? undefined : variant === "primary"
    ? { scale: 1.035, boxShadow: "0 0 0 1px rgba(16,185,129,0.5), 0 14px 40px rgba(16,185,129,0.4)" }
    : { scale: 1.035, borderColor: "var(--border-strong)" };
  const tap = reduce ? undefined : { scale: 0.97 };

  const content = children;
  if (href) {
    return (
      <motion.a href={href} target={newTab ? "_blank" : undefined}
        rel={newTab ? "noopener noreferrer" : undefined}
        style={{ ...base, ...skin }} whileHover={hover} whileTap={tap}>
        {content}
      </motion.a>
    );
  }
  return (
    <motion.button onClick={onClick} style={{ ...base, ...skin }} whileHover={hover} whileTap={tap}>
      {content}
    </motion.button>
  );
}

interface StatTileProps {
  value: string;
  label: string;
  sub?: string;
  accent?: boolean;
}

export function StatTile({ value, label, sub, accent }: StatTileProps) {
  return (
    <div style={{
      padding: "1rem 1.15rem", borderRadius: 14,
      background: "var(--surface-raised)", border: "1px solid var(--border)",
      minWidth: 130,
    }}>
      <div style={{
        fontFamily: "'Space Grotesk',var(--font-fallback,'Inter'),sans-serif",
        fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.02em",
        color: accent ? ACCENT : "var(--text-primary)", lineHeight: 1.05,
      }}>
        <AnimatedCounter value={value} />
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)",
                     marginTop: 5, letterSpacing: "0.04em" }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontFamily: FONT, fontSize: "0.62rem", color: ACCENT, marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}
