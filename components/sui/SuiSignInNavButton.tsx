"use client";
// FILE: components/sui/SuiSignInNavButton.tsx
// Nav identity. sign in, then @username / avatar as profile progresses.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSuiAuthOptional } from "./SuiAuthProvider";
import { profileInitial, profileNavLabel, useUserProfile } from "@/lib/hooks/useUserProfile";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";
const DEFAULT_AVATAR = "#10B981";

export function SuiSignInNavButton({ prominent = false }: { prominent?: boolean }) {
  const pathname = usePathname();
  const auth = useSuiAuthOptional();
  const { data: profile } = useUserProfile();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBusy(false);
  }, [pathname]);

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

  if (addr) {
    const label = profileNavLabel(profile, email);
    const hasProfile = Boolean(profile?.username || profile?.display_name);
    const avatarColor = profile?.avatar_color ?? DEFAULT_AVATAR;
    const initial = profileInitial(profile, email);
    const href = "/account";

    return (
      <Link
        href={href}
        title={hasProfile ? "Your account" : "Finish your profile"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.45rem",
          padding: prominent ? "0.45rem 0.95rem 0.45rem 0.45rem" : "0.4rem 0.85rem 0.4rem 0.4rem",
          borderRadius: 999,
          border: `1px solid ${hasProfile ? `${avatarColor}55` : `${ACCENT}44`}`,
          background: hasProfile ? `${avatarColor}14` : `${ACCENT}12`,
          fontFamily: FONT,
          fontSize: prominent ? "0.78rem" : "0.75rem",
          color: hasProfile ? "var(--text-primary)" : ACCENT,
          textDecoration: "none",
          fontWeight: 700,
          maxWidth: prominent ? 200 : 168,
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
      </Link>
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
