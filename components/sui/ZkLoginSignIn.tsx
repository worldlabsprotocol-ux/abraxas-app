"use client";
// FILE: components/sui/ZkLoginSignIn.tsx
// Sign in with Google → Sui address via zkLogin. No seed phrase required.

import { useState } from "react";
import { useSuiAuth, truncateSuiAddress } from "./SuiAuthProvider";
import Link from "next/link";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function ZkLoginSignIn({ compact = false }: { compact?: boolean }) {
  const { isAuthenticated, suiAddress, suiDid, isConfigured, signInWithGoogle, signOut, error } = useSuiAuth();
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setBusy(true);
    try {
      await signInWithGoogle();
    } finally {
      setBusy(false);
    }
  }

  if (isAuthenticated && suiAddress) {
    return (
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: compact ? 10 : 12,
        padding: compact ? "0.75rem 1rem" : "1rem 1.25rem",
      }}>
        <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
          Sui identity · zkLogin
        </div>
        <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--text-primary)", wordBreak: "break-all", marginBottom: "0.5rem" }}>
          {truncateSuiAddress(suiAddress, 10, 8)}
        </div>
        {!compact && suiDid && (
          <div style={{ fontFamily: MONO, fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
            {suiDid.slice(0, 24)}…
          </div>
        )}
        <button type="button" onClick={signOut}
          style={{ padding: "0.4rem 0.85rem", borderRadius: 999, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div style={{
      background: `${ACCENT}0A`,
      border: `1px solid ${ACCENT}33`,
      borderRadius: compact ? 10 : 12,
      padding: compact ? "0.75rem 1rem" : "1.25rem",
    }}>
      <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
        Step 1 · Create your Sui identity
      </div>
      {!compact && (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.875rem", maxWidth: 480 }}>
          Sign in with Google. Abraxas derives a Sui address for you using zkLogin — no wallet extension, no seed phrase. This address is your verification anchor on-chain.
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
        <button type="button" onClick={handleSignIn} disabled={busy || !isConfigured}
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            padding: "0.6rem 1.1rem", borderRadius: 999, border: "none",
            background: isConfigured ? ACCENT : "var(--border)",
            color: isConfigured ? "#000" : "var(--text-muted)",
            fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700,
            cursor: isConfigured && !busy ? "pointer" : "not-allowed",
            opacity: busy ? 0.7 : 1,
          }}>
          <span style={{ fontWeight: 800 }}>G</span>
          {busy ? "Redirecting…" : "Continue with Google"}
        </button>
        {!isConfigured && (
          <Link href="/docs/zklogin-setup" style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT }}>
            Setup guide →
          </Link>
        )}
      </div>
      {(error || !isConfigured) && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: !isConfigured ? "var(--text-muted)" : "#E0524F", margin: "0.75rem 0 0", lineHeight: 1.55 }}>
          {error ?? "OAuth not configured yet — follow the backend setup guide to enable Google sign-in."}
        </p>
      )}
    </div>
  );
}
