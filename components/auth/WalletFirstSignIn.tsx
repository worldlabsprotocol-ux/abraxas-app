"use client";
// FILE: components/auth/WalletFirstSignIn.tsx
// Phantom / Wallet Standard sign-in (server-verified challenge).

import { useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { signInWithSolanaWallet } from "@/lib/auth/walletLogin/client/signInWithSolanaWallet";

export function WalletFirstSignIn(props: {
  continuePath?: string | null;
  primaryLabel?: string;
  onSuccess?: (result: { continuePath: string | null; passportSubjectReady: boolean }) => void;
  compact?: boolean;
}) {
  const wallet = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await signInWithSolanaWallet({
        wallet,
        continuePath: props.continuePath,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      props.onSuccess?.({
        continuePath: result.continuePath,
        passportSubjectReady: result.passportSubjectReady,
      });
    } catch {
      setError("Wallet sign-in could not complete. Try again.");
    } finally {
      setBusy(false);
    }
  }, [wallet, props]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <button
        type="button"
        onClick={() => void signIn()}
        disabled={busy}
        style={{
          fontFamily: "'Inter',system-ui,sans-serif",
          fontSize: props.compact ? "0.78rem" : "0.82rem",
          fontWeight: 700,
          padding: props.compact ? "0.55rem 0.85rem" : "0.65rem 1rem",
          borderRadius: 10,
          border: "none",
          cursor: busy ? "wait" : "pointer",
          background: "var(--accent)",
          color: "#04110c",
        }}
      >
        {busy ? "Confirm in wallet…" : (props.primaryLabel ?? "Continue with Phantom")}
      </button>
      {error ? (
        <p style={{
          margin: 0,
          fontSize: "0.72rem",
          color: "#EF4444",
          fontFamily: "'Inter',system-ui,sans-serif",
          lineHeight: 1.5,
        }}
        >
          {error}
        </p>
      ) : null}
      <p style={{
        margin: 0,
        fontSize: "0.68rem",
        color: "var(--text-muted)",
        fontFamily: "'Inter',system-ui,sans-serif",
        lineHeight: 1.45,
      }}
      >
        Signs a one-time message only. No transaction approval or seed phrase.
      </p>
    </div>
  );
}
