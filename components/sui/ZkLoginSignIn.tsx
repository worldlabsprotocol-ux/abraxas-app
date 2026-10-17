"use client";
// FILE: components/sui/ZkLoginSignIn.tsx
// Abraxas account sign-in. Wallet under the hood. No seed phrase required.

import { useState } from "react";
import { useSuiAuth, truncateSuiAddress } from "./SuiAuthProvider";
import { PassportEntryPanel } from "@/components/passport/PassportEntryPanel";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function ZkLoginSignIn({ compact = false }: { compact?: boolean }) {
  const { isAuthenticated, suiAddress, signOut } = useSuiAuth();
  const [showAddress, setShowAddress] = useState(false);

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

  return <PassportEntryPanel compact={compact} />;
}
