"use client";
// FILE: components/sui/SuiSignInNavButton.tsx
// Nav CTA — prominent Google zkLogin on every redesign surface.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSuiAuthOptional } from "./SuiAuthProvider";
import { truncateSuiAddress } from "@/lib/sui/identity";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function SuiSignInNavButton({ prominent = false }: { prominent?: boolean }) {
  const pathname = usePathname();
  const auth = useSuiAuthOptional();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBusy(false);
  }, [pathname]);

  const addr = auth?.suiAddress ?? null;
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
    return (
      <Link href="/passport" title="View your Passport"
        style={{
          padding: prominent ? "0.5rem 0.95rem" : "0.45rem 0.85rem",
          borderRadius: 999,
          border: `1px solid ${ACCENT}44`,
          background: `${ACCENT}12`,
          fontFamily: MONO,
          fontSize: prominent ? "0.72rem" : "0.68rem",
          color: ACCENT,
          textDecoration: "none",
          fontWeight: 600,
        }}>
        {truncateSuiAddress(addr, 4, 4)}
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
