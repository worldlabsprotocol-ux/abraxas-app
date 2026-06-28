"use client";
// FILE: components/terminal/ui.tsx
// Shared UI: Label, Divider, Button, ScrollFade, GlassPanel.

import { useState, useEffect, useRef } from "react";
import { M, G, BDR } from "./tokens";

interface ScrollFadeProps {
  children: React.ReactNode;
  delay?: number;
}

export function ScrollFade({ children, delay = 0 }: ScrollFadeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`,
      }}
    >
      {children}
    </div>
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
  return (
    <div style={{ height:1, background:BDR, margin:"1.75rem 0" }} />
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
    transition:"transform 0.12s, box-shadow 0.12s",
  };

  if (href && !disabled) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={style}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} style={style}>
      {children}
    </button>
  );
}

interface PanelProps {
  children: React.ReactNode;
  glow?: boolean;
}

export function Panel({ children, glow = false }: PanelProps) {
  return (
    <div style={{
      background: "var(--surface-glass)",
      backdropFilter: "blur(var(--glass-blur))",
      WebkitBackdropFilter: "blur(var(--glass-blur))",
      borderRadius: "var(--radius-lg)",
      padding: "1.35rem clamp(0.875rem, 3vw, 1.65rem)",
      border: glow ? "1px solid var(--border-strong)" : "1px solid var(--border)",
      boxShadow: glow ? "var(--shadow-glow)" : "var(--shadow-card)",
    }}>
      {children}
    </div>
  );
}

export function GlassPanel({ children, glow = false }: PanelProps) {
  return <Panel glow={glow}>{children}</Panel>;
}
