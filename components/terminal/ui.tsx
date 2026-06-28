"use client";
// FILE: components/terminal/ui.tsx
// Shared micro-components: Label, Divider, Button, ScrollFade, GlowButton.

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
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
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
      <div style={{ width:3, height:15, background:G, borderRadius:2,
                     boxShadow:`0 0 8px ${G}50` }} />
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
    <div style={{ height:1, background:BDR, margin:"1.5rem 0" }} />
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
  const pad = size === "sm" ? "0.45rem 0.875rem"
    : size === "lg" ? "0.8rem 1.75rem"
    : "0.65rem 1.25rem";
  const fontSize = size === "sm" ? "0.62rem"
    : size === "lg" ? "0.82rem"
    : "0.72rem";
  const radius = size === "lg" ? 999 : 10;

  const isGlow = variant === "glow";
  const isFilled = variant === "filled" || isGlow;

  const style: React.CSSProperties = {
    display:"inline-flex", alignItems:"center", justifyContent:"center",
    width: fullWidth ? "100%" : undefined,
    padding:pad, borderRadius:radius,
    border: isGlow ? `1.5px solid ${color}` :
            variant === "filled" ? "none" : `1.5px solid ${color}`,
    background: isGlow ? "var(--surface)" :
                variant === "filled" ? color : `${color}10`,
    color: isFilled && !isGlow ? "#000" : isGlow ? color : color,
    fontFamily: size === "lg" ? "'Inter',system-ui,sans-serif" : M,
    fontSize,
    fontWeight: size === "lg" ? 700 : 800,
    textTransform: size === "lg" ? "none" : "uppercase",
    letterSpacing: size === "lg" ? "-0.01em" : "0.05em",
    textDecoration:"none", cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    boxShadow: isGlow && !disabled ? `0 0 0 1px ${color}55, 0 0 28px ${color}30` :
               variant === "filled" && !disabled ? `0 0 16px ${color}28` : "none",
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
      background: "var(--surface)",
      borderRadius: 18,
      padding: "1.25rem clamp(0.875rem, 3vw, 1.5rem)",
      border: `1px solid ${BDR}`,
      boxShadow: glow ? "var(--shadow-glow)" : "var(--shadow-card)",
    }}>
      {children}
    </div>
  );
}
