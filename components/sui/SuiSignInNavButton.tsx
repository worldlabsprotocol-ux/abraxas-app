"use client";
// FILE: components/sui/SuiSignInNavButton.tsx
// Nav identity — sign in, then profile menu with account links and sign out.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSuiAuthOptional } from "./SuiAuthProvider";
import { profileInitial, profileNavLabel, useUserProfile } from "@/lib/hooks/useUserProfile";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";
const DEFAULT_AVATAR = "#10B981";

const MENU_ITEM: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.55rem 0.85rem",
  border: "none",
  background: "transparent",
  textAlign: "left",
  fontFamily: FONT,
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "var(--text-primary)",
  textDecoration: "none",
  cursor: "pointer",
};

export function SuiSignInNavButton({ prominent = false }: { prominent?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const auth = useSuiAuthOptional();
  const { data: profile } = useUserProfile();
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBusy(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  const addr = auth?.suiAddress ?? null;
  const email = auth?.session?.email ?? null;
  const configured = auth?.isConfigured ?? false;

  async function handleSignIn() {
    if (!auth?.signInWithGoogle) return;
    setBusy(true);
    try {
      await auth.signInWithGoogle();
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    if (!auth?.signOut) return;
    setSignOutBusy(true);
    setMenuOpen(false);
    try {
      await auth.signOut();
      queryClient.clear();
      router.push("/");
      router.refresh();
    } finally {
      setSignOutBusy(false);
    }
  }

  if (addr) {
    const label = profileNavLabel(profile, email);
    const hasProfile = Boolean(profile?.username || profile?.display_name);
    const avatarColor = profile?.avatar_color ?? DEFAULT_AVATAR;
    const initial = profileInitial(profile, email);
    const accountHref = hasProfile ? "/account" : "/verify?mode=profile";

    return (
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(open => !open)}
          title="Account menu"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: prominent ? "0.45rem 0.95rem 0.45rem 0.45rem" : "0.4rem 0.85rem 0.4rem 0.4rem",
            borderRadius: 999,
            border: `1px solid ${hasProfile ? `${avatarColor}55` : `${ACCENT}44`}`,
            background: menuOpen ? `${avatarColor}22` : hasProfile ? `${avatarColor}14` : `${ACCENT}12`,
            fontFamily: FONT,
            fontSize: prominent ? "0.78rem" : "0.75rem",
            color: hasProfile ? "var(--text-primary)" : ACCENT,
            fontWeight: 700,
            maxWidth: prominent ? 200 : 168,
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: avatarColor,
              color: "#04130C",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT,
              fontSize: "0.72rem",
              fontWeight: 800,
              flexShrink: 0,
              boxShadow: hasProfile ? `0 0 12px ${avatarColor}44` : "none",
            }}
          >
            {initial}
          </span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {label}
          </span>
          {hasProfile && (
            <span style={{ fontSize: "0.62rem", color: ACCENT, flexShrink: 0 }}>✓</span>
          )}
        </button>

        {menuOpen && (
          <div
            role="menu"
            style={{
              position: "absolute",
              top: "calc(100% + 0.45rem)",
              right: 0,
              minWidth: 196,
              padding: "0.35rem",
              borderRadius: 12,
              border: "1px solid var(--border-strong)",
              background: "var(--nav-bg-solid)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
              zIndex: 300,
            }}
          >
            <div style={{
              padding: "0.55rem 0.85rem 0.65rem",
              borderBottom: "1px solid var(--border)",
              marginBottom: "0.25rem",
            }}>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {label}
              </div>
              {email && (
                <div style={{
                  fontFamily: FONT,
                  fontSize: "0.68rem",
                  color: "var(--text-muted)",
                  marginTop: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 220,
                }}>
                  {email}
                </div>
              )}
            </div>

            <Link
              href={accountHref}
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              style={MENU_ITEM}
            >
              {hasProfile ? "My account" : "Finish profile"}
            </Link>
            <Link href="/passport" role="menuitem" onClick={() => setMenuOpen(false)} style={MENU_ITEM}>
              Passport
            </Link>
            <Link href="/verify?mode=profile" role="menuitem" onClick={() => setMenuOpen(false)} style={MENU_ITEM}>
              Edit profile
            </Link>

            <div style={{ height: 1, background: "var(--border)", margin: "0.35rem 0" }} />

            <button
              type="button"
              role="menuitem"
              onClick={() => void handleSignOut()}
              disabled={signOutBusy}
              style={{
                ...MENU_ITEM,
                color: "#EF4444",
                opacity: signOutBusy ? 0.6 : 1,
              }}
            >
              {signOutBusy ? "Signing out…" : "Sign out"}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (prominent && configured) {
    return (
      <button type="button" onClick={handleSignIn} disabled={busy}
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.4rem",
          padding: "0.55rem 1rem", borderRadius: 999, border: "none",
          background: ACCENT, color: "#000",
          fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700,
          cursor: busy ? "wait" : "pointer", opacity: busy ? 0.75 : 1,
          whiteSpace: "nowrap",
        }}>
        <span style={{ fontWeight: 800, fontSize: "0.9rem" }}>G</span>
        {busy ? "Redirecting…" : "Continue with Google"}
      </button>
    );
  }

  return (
    <Link href="/passport" style={{
      padding: prominent ? "0.55rem 1rem" : "0.45rem 0.95rem",
      borderRadius: 999,
      border: configured ? `1px solid ${ACCENT}55` : "1px solid var(--border)",
      background: configured ? `${ACCENT}14` : "var(--surface)",
      fontFamily: FONT,
      fontSize: prominent ? "0.82rem" : "0.78rem",
      fontWeight: 700,
      color: configured ? ACCENT : "var(--text-secondary)",
      textDecoration: "none",
      whiteSpace: "nowrap",
    }}>
      {configured ? "Sign in with Google" : "Sign in"}
    </Link>
  );
}
