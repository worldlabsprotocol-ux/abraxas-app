"use client";
// FILE: components/nav/SolanaAccountSignInDialog.tsx

import { useCallback, useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { completeSolanaAccountSignIn } from "@/lib/auth/nativeAccount/clientSolanaAccountSignIn";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function SolanaAccountSignInDialog({
  open,
  onClose,
  onSuccess,
  busy,
  setBusy,
  setError,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setError: (v: string | null) => void;
}) {
  const { publicKey, signMessage, connected, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    if (!connected && !connecting) {
      setVisible(true);
    }
    primaryRef.current?.focus();
  }, [open, connected, connecting, setVisible]);

  useEffect(() => {
    if (!open || busy) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  const runSign = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setError("Choose a Solana wallet to continue.");
      setVisible(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await completeSolanaAccountSignIn({
        walletAddress: publicKey.toBase58(),
        signMessage,
      });
      if (!result.ok) {
        if (result.reason === "cancelled") {
          onClose();
          return;
        }
        setError(result.message ?? "Could not sign in.");
        return;
      }
      onSuccess();
      onClose();
    } finally {
      setBusy(false);
    }
  }, [publicKey, signMessage, setBusy, setError, onSuccess, onClose, setVisible]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sol-account-signin-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(0,0,0,0.72)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        style={{
          width: "min(420px, 100%)",
          borderRadius: 16,
          border: "1px solid var(--border)",
          background: "var(--surface-raised)",
          padding: "1.25rem 1.35rem",
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
        }}
      >
        <h2
          id="sol-account-signin-title"
          style={{
            margin: "0 0 0.65rem",
            fontFamily: FONT,
            fontSize: "1.05rem",
            fontWeight: 650,
            color: "var(--text-primary)",
          }}
        >
          Sign in to Abraxas
        </h2>
        <p style={{ margin: "0 0 0.5rem", fontFamily: FONT, fontSize: "0.86rem", lineHeight: 1.55, color: "var(--text-secondary)" }}>
          Your wallet proves that you control this address.
        </p>
        <p style={{ margin: "0 0 1rem", fontFamily: FONT, fontSize: "0.86rem", lineHeight: 1.55, color: "var(--text-secondary)" }}>
          Abraxas uses this signature to create a secure account session and give you access to your workspace. This does
          not transfer funds, grant spending permissions, or verify your personal identity.
        </p>
        {publicKey ? (
          <p style={{ margin: "0 0 1rem", fontFamily: FONT, fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Wallet: {publicKey.toBase58().slice(0, 4)}…{publicKey.toBase58().slice(-4)}
          </p>
        ) : (
          <p style={{ margin: "0 0 1rem", fontFamily: FONT, fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Select a wallet from the wallet picker, then continue.
          </p>
        )}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            ref={primaryRef}
            type="button"
            disabled={busy}
            onClick={() => void runSign()}
            style={{
              flex: 1,
              minWidth: 140,
              padding: "0.65rem 1rem",
              borderRadius: 10,
              border: "none",
              background: "var(--accent-primary, #14F195)",
              color: "#04110c",
              fontFamily: FONT,
              fontWeight: 700,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy ? "Signing in…" : "Sign to continue"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            style={{
              padding: "0.65rem 1rem",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontFamily: FONT,
              fontWeight: 600,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
