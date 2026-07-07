"use client";
// FILE: components/passport/WalletBindingCard.tsx
// Upgrade wallet binding from zkLogin to signed challenge (L3 assurance).

import { useState } from "react";
import { signIntentMessage } from "@/lib/sui/intent/personalMessage";
import { getEphemeralSecretKey } from "@/lib/sui/zklogin/signingSession";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function WalletBindingCard({ suiAddress }: { suiAddress: string | null }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!suiAddress) return null;

  async function confirmBinding() {
    setBusy(true);
    setMsg(null);
    try {
      const secret = getEphemeralSecretKey();
      if (!secret) throw new Error("Sign in again to enable wallet signing.");

      const chRes = await fetch("/api/wallet/binding/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sui_address: suiAddress }),
      });
      const challenge = await chRes.json() as {
        challenge_id?: string;
        message?: string;
        error?: string;
      };
      if (!chRes.ok || !challenge.challenge_id || !challenge.message) {
        throw new Error(challenge.error ?? "Challenge failed");
      }

      const { signature, publicKey } = await signIntentMessage(challenge.message, secret);

      const confirmRes = await fetch("/api/wallet/binding/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: challenge.challenge_id,
          sui_address: suiAddress,
          message: challenge.message,
          signature,
          public_key: publicKey,
        }),
      });
      const result = await confirmRes.json() as { ok?: boolean; error?: string };
      if (!confirmRes.ok) throw new Error(result.error ?? "Confirm failed");

      setDone(true);
      setMsg("Wallet binding upgraded to signed challenge (L3).");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Binding failed");
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
        Wallet binding · step-up
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: "0 0 0.65rem", lineHeight: 1.6 }}>
        Prove wallet control with a one-time signed challenge — required for high-value RWA and lending policies.
      </p>
      {!done && (
        <button type="button" onClick={confirmBinding} disabled={busy}
          style={{
            padding: "0.55rem 1rem", borderRadius: 999, border: "none",
            background: busy ? `${ACCENT}55` : ACCENT, color: "#000",
            fontFamily: FONT, fontSize: "0.75rem", fontWeight: 800, cursor: busy ? "wait" : "pointer",
          }}>
          {busy ? "Signing…" : "Sign wallet binding challenge →"}
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
