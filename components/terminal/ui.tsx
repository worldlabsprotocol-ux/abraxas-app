"use client";
// FILE: components/terminal/ui.tsx
// Shared micro-components: Label, Divider, Button, ScrollFade.

import { useState, useEffect, useRef } from "react";
import { M, G, BDR } from "./tokens";

interface ScrollFadeProps {
  children: React.ReactNode;
  delay?: number;
}

// Fades a section in as it enters the viewport. Wrap any section with this
// for the same scroll-triggered animation used on the landing page.
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
                     boxShadow:`0 0 6px ${G}60` }} />
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
  variant?: "filled" | "outline";
  color?: string;
  size?: "sm" | "md";
  fullWidth?: boolean;
}

// Real button — filled background, padding, rounded corners, clear tap target.
// Use for every actionable CTA. Never style a CTA as a plain text link.
export function Button({
  children, onClick, href, variant = "filled",
  color = G, size = "md", fullWidth = false,
}: ButtonProps) {
  const pad = size === "sm" ? "0.45rem 0.875rem" : "0.65rem 1.25rem";
  const fontSize = size === "sm" ? "0.62rem" : "0.72rem";

  const style: React.CSSProperties = {
    display:"inline-flex", alignItems:"center", justifyContent:"center",
    width: fullWidth ? "100%" : undefined,
    padding:pad, borderRadius:6,
    border: variant === "filled" ? "none" : `1.5px solid ${color}`,
    background: variant === "filled" ? color : `${color}10`,
    color: variant === "filled" ? "#000" : color,
    fontFamily:M, fontSize, fontWeight:800,
    textTransform:"uppercase", letterSpacing:"0.05em",
    textDecoration:"none", cursor:"pointer",
    boxShadow: variant === "filled" ? `0 0 14px ${color}35` : "none",
    transition:"transform 0.12s, box-shadow 0.12s",
  };

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={style}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} style={style}>
      {children}
    </button>
  );
}
