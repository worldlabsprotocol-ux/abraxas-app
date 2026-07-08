"use client";
// FILE: components/sui/ZkLoginSignIn.tsx
// Sign in with Google — Abraxas wallet under the hood. No seed phrase required.

import { useState } from "react";
import { useSuiAuth, truncateSuiAddress } from "./SuiAuthProvider";
import Link from "next/link";
import { consumerCopy } from "@/lib/consumerCopy";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function ZkLoginSignIn({ compact = false }: { compact?: boolean }) {
  const { isAuthenticated, suiAddress, isConfigured, signInWithGoogle, signOut, error } = useSuiAuth();
  const [busy, setBusy] = useState(false);
  const [showAddress, setShowAddress] = useState(false);

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
        <div style={{ fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
          Signed in
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
          Your Abraxas account is ready
        </div>
        {showAddress ? (
          <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", wordBreak: "break-all", marginBottom: "0.5rem" }}>
            Wallet: {truncateSuiAddress(suiAddress, 10, 8)}
          </div>
        ) : (
          <button type="button" onClick={() => setShowAddress(true)}
            style={{ background: "transparent", border: "none", padding: 0, marginBottom: "0.5rem", cursor: "pointer",
              fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", textDecoration: "underline" }}>
            Show wallet address
          </button>
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
      <div style={{ fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
        {consumerCopy.passport.walletStep}
      </div>
      {!compact && (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.875rem", maxWidth: 480 }}>
          {consumerCopy.passport.walletHint}
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
          {error ?? "Sign in is being configured. Check back soon or contact support."}
        </p>
      )}
    </div>
  );
}
