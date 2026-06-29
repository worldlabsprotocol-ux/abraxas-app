"use client";
// FILE: components/terminal/ui.tsx
// Shared UI: Label, Divider, Button, ScrollFade, GlassPanel.

import { motion, useReducedMotion } from "framer-motion";
import { M, G, BDR } from "./tokens";
import { springSnappy, easeOutFast } from "@/lib/motion/variants";

interface ScrollFadeProps {
  children: React.ReactNode;
  delay?: number;
}

// Scroll-triggered fade + rise. Now backed by Framer Motion's
// whileInView (spring-smooth, GPU-friendly) while keeping the original
// { children, delay } API so every existing call site is unchanged.
export function ScrollFade({ children, delay = 0 }: ScrollFadeProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1, margin: "0px 0px -6% 0px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

interface LabelProps { children: React.ReactNode }

export function Label({ children }: LabelProps) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"0.625rem",
                   marginBottom:"1.125rem" }}>
      <div style={{ width:3, height:16, background:G, borderRadius:2,
                     boxShadow:`0 0 10px ${G}60` }} />
      <span style={{ fontFamily:M, fontSize:"clamp(0.78rem,1.8vw,0.92rem)",
                      fontWeight:800, color:G, letterSpacing:"0.16em",
                      textTransform:"uppercase" }}>
        {children}
      </span>
    </div>
  );
}

export function Divider() {
  // More vertical breathing room between sections (design-director pass):
  // the rule is whitespace first; the hairline is secondary and faint.
  return (
    <div style={{ height:1, background:BDR,
                   margin:"clamp(2.5rem, 6vw, 4.5rem) 0",
                   opacity:0.6 }} />
  );
}

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "filled" | "outline" | "glow";
  color?: string;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  disabled?: boolean;
}

export function Button({
  children, onClick, href, variant = "filled",
  color = G, size = "md", fullWidth = false, disabled = false,
}: ButtonProps) {
  const pad = size === "sm" ? "0.5rem 1rem"
    : size === "lg" ? "0.85rem 1.85rem"
    : "0.7rem 1.35rem";
  const fontSize = size === "sm" ? "0.65rem"
    : size === "lg" ? "0.88rem"
    : "0.74rem";
  const radius = 999;

  const isGlow = variant === "glow";
  const isFilled = variant === "filled" || isGlow;

  const style: React.CSSProperties = {
    display:"inline-flex", alignItems:"center", justifyContent:"center",
    width: fullWidth ? "100%" : undefined,
    padding:pad, borderRadius:radius,
    border: isGlow ? `1.5px solid ${color}` :
            variant === "filled" ? "none" : `1.5px solid ${color}`,
    background: isGlow ? "var(--surface-raised)" :
                variant === "filled" ? color : `${color}12`,
    color: isFilled && !isGlow ? "#000" : color,
    fontFamily: "'Inter',system-ui,sans-serif",
    fontSize,
    fontWeight: 700,
    textTransform: size === "lg" ? "none" : "uppercase",
    letterSpacing: size === "lg" ? "-0.01em" : "0.04em",
    textDecoration:"none", cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    boxShadow: isGlow && !disabled ? "var(--shadow-glow)" :
               variant === "filled" && !disabled ? `0 0 24px ${color}35` : "none",
    willChange: "transform",
  };

  const interactive = !disabled;
  const hover = interactive
    ? { scale: 1.06, boxShadow: `0 0 32px ${color}66`, transition: springSnappy }
    : undefined;
  const tap = interactive ? { scale: 0.96, transition: easeOutFast } : undefined;

  if (href && !disabled) {
    return (
      <motion.a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={style}
        whileHover={hover}
        whileTap={tap}
      >
        {children}
      </motion.a>
    );
  }
  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={style}
      whileHover={hover}
      whileTap={tap}
    >
      {children}
    </motion.button>
  );
}

interface PanelProps {
  children: React.ReactNode;
  glow?: boolean;
}

export function Panel({ children, glow = false }: PanelProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      style={{
        background: "var(--surface-raised)",
        borderRadius: "var(--radius-lg)",
        padding: "1.35rem clamp(0.875rem, 3vw, 1.65rem)",
        border: glow ? "1px solid var(--border-strong)" : "1px solid var(--border)",
        boxShadow: glow ? "var(--shadow-glow)" : "var(--shadow-card)",
        willChange: "transform",
      }}
      whileHover={reduce ? undefined : { y: -3, transition: springSnappy }}
    >
      {children}
    </motion.div>
  );
}

export function GlassPanel({ children, glow = false }: PanelProps) {
  return <Panel glow={glow}>{children}</Panel>;
}
