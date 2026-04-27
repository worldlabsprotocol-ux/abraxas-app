"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "secondary";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  fullWidth?: boolean;
}

const base = "inline-flex items-center justify-center gap-2 cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 uppercase tracking-widest";

const variants: Record<Variant, string> = {
  primary: "text-deep font-semibold",
  ghost: "text-abraxas-text font-medium",
  secondary: "text-abraxas-muted font-medium",
};

const sizes: Record<Size, string> = {
  sm: "text-[0.65rem] px-3 py-1.5 rounded-md",
  md: "text-[0.72rem] px-5 py-2.5 rounded-btn",
  lg: "text-[0.75rem] px-7 py-3 rounded-btn",
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  fullWidth,
  className = "",
  style,
  ...props
}: ButtonProps) {
  const inlineStyle: React.CSSProperties = variant === "primary"
    ? {
        background: "var(--gold)",
        border: "none",
        ...style,
      }
    : variant === "ghost"
    ? {
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.12)",
        ...style,
      }
    : {
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        ...style,
      };

  const hoverClass = variant === "primary"
    ? "hover:opacity-85"
    : "hover:border-gold hover:text-gold";

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${hoverClass} ${fullWidth ? "w-full" : ""} ${className}`}
      style={inlineStyle}
      {...props}
    >
      {children}
    </button>
  );
}
