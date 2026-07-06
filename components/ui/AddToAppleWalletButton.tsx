"use client";
// Reusable Add to Apple Wallet CTA with pass icon (not emoji).

import type { CSSProperties, ReactNode } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { WalletPassIcon } from "@/components/ui/WalletPassIcon";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

type Variant = "dark" | "primary" | "ghost";

export function AddToAppleWalletButton({
  href,
  onClick,
  busy = false,
  disabled = false,
  children = "Add to Apple Wallet",
  variant = "dark",
  size = "md",
  fullWidth = false,
  style,
}: {
  href?: string;
  onClick?: () => void;
  busy?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  style?: CSSProperties;
}) {
  const isDisabled = disabled || busy;
  const pad = size === "sm" ? "0.55rem 1rem" : size === "lg" ? "0.85rem 1.35rem" : "0.65rem 1.15rem";
  const fs = size === "sm" ? "0.78rem" : size === "lg" ? "0.9rem" : "0.82rem";
  const iconSize = size === "sm" ? 16 : size === "lg" ? 20 : 18;

  const skin: CSSProperties =
    variant === "primary"
      ? {
          background: "#10B981",
          color: "#04130C",
          border: "none",
          boxShadow: "0 4px 14px rgba(16,185,129,0.3)",
        }
      : variant === "ghost"
      ? {
          background: "transparent",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
        }
      : {
          background: isDisabled ? "#333" : "#000",
          color: "#fff",
          border: "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
        };

  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.55rem",
    width: fullWidth ? "100%" : undefined,
    padding: pad,
    borderRadius: variant === "primary" ? 999 : 10,
    fontFamily: FONT,
    fontSize: fs,
    fontWeight: 600,
    cursor: isDisabled ? "wait" : "pointer",
    textDecoration: "none",
    minHeight: size === "sm" ? 40 : 44,
    opacity: isDisabled && variant !== "dark" ? 0.55 : 1,
    ...skin,
    ...style,
  };

  const content = (
    <>
      {busy ? (
        <Spinner size={iconSize} color={variant === "primary" ? "#04130C" : "#fff"} />
      ) : (
        <WalletPassIcon size={iconSize} color="currentColor" />
      )}
      {busy ? "Preparing pass…" : children}
    </>
  );

  if (href && !isDisabled) {
    return (
      <a href={href} style={base} aria-label={typeof children === "string" ? children : "Add to Apple Wallet"}>
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={busy || undefined}
      style={base}
    >
      {content}
    </button>
  );
}
