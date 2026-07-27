"use client";
// FILE: components/sui/NavProfileMenu.tsx
// Signed-in profile menu. Passport, account, submit asset (replaces nav Passport tab).

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSuiAuthOptional } from "./SuiAuthProvider";
import { profileInitial, profileNavLabel, useUserProfile } from "@/lib/hooks/useUserProfile";
import { useGoogleSignIn } from "@/lib/hooks/useGoogleSignIn";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const ACCENT = "#10B981";
const DEFAULT_AVATAR = "#10B981";

const MENU_ITEMS = [
  { label: "Passport", href: "/passport", description: "Your proofs & verification" },
  { label: "Account settings", href: "/account", description: "Name, profile, status" },
  { label: "Verify a record", href: "/verify", description: "Look up an asset" },
  { label: "Tokenize an asset", href: "/build", description: "Start owner intake" },
  { label: "Design partners", href: "/design-partner", description: "For apps integrating Abraxas" },
] as const;

export function NavProfileMenu({ prominent = false }: { prominent?: boolean }) {
  const auth = useSuiAuthOptional();
  const { data: profile } = useUserProfile();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const addr = auth?.suiAddress ?? null;
  const email = auth?.session?.email ?? null;
  const configured = auth?.isConfigured ?? false;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (addr) {
    const label = profileNavLabel(profile, email);
    const avatarColor = profile?.avatar_color ?? DEFAULT_AVATAR;
    const initial = profileInitial(profile, email);

    return (
      <div ref={rootRef} style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: prominent ? "0.45rem 0.95rem 0.45rem 0.45rem" : "0.4rem 0.85rem 0.4rem 0.4rem",
            borderRadius: 999,
            border: `1px solid ${avatarColor}55`,
            background: `${avatarColor}14`,
            fontFamily: FONT,
            fontSize: prominent ? "0.82rem" : "0.78rem",
            color: "var(--text-primary)",
            fontWeight: 700,
            cursor: "pointer",
            maxWidth: prominent ? 220 : 188,
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: avatarColor,
              color: "#04130C",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {initial}
          </span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {label}
          </span>
          <span style={{ fontSize: "0.55rem", opacity: 0.7, flexShrink: 0 }}>{open ? "▴" : "▾"}</span>
        </button>

        {open && (
          <div
            role="menu"
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              minWidth: 240,
              padding: "0.45rem",
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--nav-bg-solid)",
              boxShadow: "var(--shadow-soft)",
              zIndex: 400,
            }}
          >
            {MENU_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                style={{
                  display: "block",
                  padding: "0.65rem 0.7rem",
                  borderRadius: 10,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ fontFamily: FONT, fontSize: "0.84rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {item.label}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                  {item.description}
                </div>
              </Link>
            ))}
            <div style={{ height: 1, background: "var(--border)", margin: "0.35rem 0" }} />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                auth?.signOut();
                setOpen(false);
              }}
              style={{
                width: "100%",
                padding: "0.55rem 0.7rem",
                borderRadius: 10,
                border: "none",
                background: "transparent",
                fontFamily: FONT,
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export function NavSignInButton({ prominent = false }: { prominent?: boolean }) {
  const { signIn, busy, configured, disabled } = useGoogleSignIn();

  if (configured) {
    return (
      <button
        type="button"
        onClick={() => void signIn()}
        disabled={disabled}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: prominent ? "0.55rem 1rem" : "0.5rem 0.95rem",
          borderRadius: 999,
          border: "none",
          background: ACCENT,
          color: "#000",
          fontFamily: FONT,
          fontSize: prominent ? "0.84rem" : "0.8rem",
          fontWeight: 700,
          cursor: busy ? "wait" : "pointer",
          opacity: busy ? 0.75 : 1,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontWeight: 800, fontSize: "0.9rem" }}>G</span>
        {busy ? "Redirecting…" : "Sign in"}
      </button>
    );
  }

  return (
    <Link
      href="/passport"
      style={{
        padding: prominent ? "0.55rem 1rem" : "0.5rem 0.95rem",
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        fontFamily: FONT,
        fontSize: prominent ? "0.84rem" : "0.8rem",
        fontWeight: 700,
        color: "var(--text-secondary)",
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      Sign in
    </Link>
  );
}
