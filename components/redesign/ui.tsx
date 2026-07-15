"use client";
// FILE: components/redesign/ui.tsx
// Redesign primitives: Button + StatTile. Institutional gold primary, glass stats.

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode, CSSProperties } from "react";
import { AnimatedCounter } from "@/lib/motion/AnimatedCounter";
import { Spinner } from "@/components/ui/Spinner";
import { INSTITUTIONAL_PRIMARY_BTN_TEXT } from "@/lib/design/institutionalTheme";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

type Variant = "primary" | "secondary" | "ghost" | "tertiary";
type Size = "sm" | "md" | "lg";

interface BtnProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  newTab?: boolean;
  disabled?: boolean;
  loading?: boolean;
  ariaLabel?: string;
  style?: CSSProperties;
}

export function Btn({
  children, onClick, href, variant = "primary", size = "md",
  fullWidth = false, newTab = false, disabled = false, loading = false,
  ariaLabel, style,
}: BtnProps) {
  const reduce = useReducedMotion();
  const isDisabled = disabled || loading;
  const pad = size === "sm" ? "0.55rem 1.05rem" : size === "lg" ? "0.95rem 1.75rem" : "0.7rem 1.3rem";
  const fs  = size === "sm" ? "0.78rem" : size === "lg" ? "0.95rem" : "0.86rem";
  const minH = size === "sm" ? 40 : 44;

  const base: CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
    width: fullWidth ? "100%" : undefined,
    minHeight: minH,
    padding: pad, borderRadius: 999, fontFamily: FONT, fontSize: fs, fontWeight: 700,
    letterSpacing: "-0.01em", cursor: isDisabled ? "not-allowed" : "pointer",
    textDecoration: "none", whiteSpace: "nowrap", willChange: "transform",
    opacity: isDisabled ? 0.55 : 1,
    ...style,
  };

  const skin: CSSProperties =
    variant === "primary"
      ? {
          background: "var(--btn-primary-bg)",
          color: INSTITUTIONAL_PRIMARY_BTN_TEXT,
          border: "none",
          boxShadow: isDisabled ? "none" : "var(--shadow-glow)",
        }
      : variant === "secondary"
      ? {
          background: "rgba(255,255,255,0.03)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-strong)",
          backdropFilter: "blur(8px)",
        }
      : variant === "tertiary"
      ? { background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }
      : { background: "transparent", color: "var(--text-secondary)", border: "none" };

  const hover = reduce || isDisabled ? undefined : variant === "primary"
    ? { scale: 1.035, boxShadow: "0 0 0 1px rgba(232,197,71,0.5), 0 12px 36px rgba(232,197,71,0.28)" }
    : variant === "secondary"
    ? { scale: 1.02, borderColor: "var(--accent-border)" }
    : { scale: 1.02 };
  const tap = reduce || isDisabled ? undefined : { scale: 0.97 };

  const content = (
    <>
      {loading && (
        <Spinner
          size={size === "sm" ? 14 : 16}
          color={variant === "primary" ? INSTITUTIONAL_PRIMARY_BTN_TEXT : "var(--accent)"}
        />
      )}
      {children}
    </>
  );

  if (href && !isDisabled) {
    return (
      <motion.a href={href} target={newTab ? "_blank" : undefined}
        rel={newTab ? "noopener noreferrer" : undefined}
        aria-label={ariaLabel}
        className="abx-interactive"
        style={{ ...base, ...skin }} whileHover={hover} whileTap={tap}>
        {content}
      </motion.a>
    );
  }
  return (
    <motion.button
      type="button"
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      className="abx-interactive"
      style={{ ...base, ...skin }}
      whileHover={hover}
      whileTap={tap}
    >
      {content}
    </motion.button>
  );
}

interface StatTileProps {
  value: string;
  label: string;
  sub?: string;
  accent?: boolean;
  /** Alternate accent — violet stat tile */
  accentVariant?: "gold" | "violet";
}

export function StatTile({ value, label, sub, accent, accentVariant = "gold" }: StatTileProps) {
  const valueColor = accent
    ? accentVariant === "violet" ? "var(--accent-2)" : "var(--accent)"
    : "var(--text-primary)";

  return (
    <div className="abx-glass-panel" style={{
      padding: "1rem 1.15rem", borderRadius: 14,
      minWidth: 130,
    }}>
      <div style={{
        fontFamily: "'Space Grotesk',var(--font-fallback,'Inter'),sans-serif",
        fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.02em",
        color: valueColor, lineHeight: 1.05,
      }}>
        <AnimatedCounter value={value} />
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)",
                     marginTop: 5, letterSpacing: "0.04em" }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--accent)", marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}
