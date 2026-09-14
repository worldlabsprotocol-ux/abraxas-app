"use client";
// FILE: components/passport/WalletBindingCard.tsx
// Canonical zkLogin wallet binding repair — legacy L3 Sui step-up disabled.

import { useState } from "react";
import { repairZkLoginBinding } from "@/lib/walletAuthority/client/repairZkLoginBinding";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function WalletBindingCard({ suiAddress }: { suiAddress: string | null }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!suiAddress) return null;

  async function repairBinding() {
    setBusy(true);
    setMsg(null);
    try {
      const result = await repairZkLoginBinding();
      if (!result.ok) {
        throw new Error(result.error ?? "Wallet binding repair failed");
      }
      setDone(true);
      setMsg(result.wallet_binding_status === "repaired"
        ? "Wallet binding repaired."
        : "Wallet binding is active.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Binding repair failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      background: "var(--surface-raised)",
      border: "1px solid var(--border-strong)",
      borderRadius: 16,
      padding: "1rem 1.15rem",
      marginBottom: "1.5rem",
    }}>
      <div style={{
        fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
        color: ACCENT, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.35rem",
      }}>
        Wallet binding
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: "0 0 0.65rem", lineHeight: 1.6 }}>
        Abraxas stores a canonical zkLogin wallet binding for your Passport. Legacy unsigned step-up binding is disabled.
      </p>
      {!done && (
        <button type="button" onClick={repairBinding} disabled={busy}
          style={{
            padding: "0.55rem 1rem", borderRadius: 999, border: "none",
            background: busy ? `${ACCENT}55` : ACCENT, color: "#000",
            fontFamily: FONT, fontSize: "0.75rem", fontWeight: 800, cursor: busy ? "wait" : "pointer",
          }}>
          {busy ? "Repairing…" : "Repair wallet binding"}
        </button>
      )}
      {msg && (
        <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: done ? ACCENT : "var(--text-muted)", margin: "0.55rem 0 0" }}>
          {msg}
        </p>
      )}
    </div>
  );
}
