"use client";
// FILE: components/passport/PassportSolanaSignInButton.tsx

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { HOLDER_AUTH_ACTIONS } from "@/lib/auth/holderSubject/contract";
import { describeWalletVerifyRecoveryCode } from "@/lib/auth/holderAuthErrorCopy";
import { runPassportSolanaWalletAuth } from "@/lib/wallet/passportSolanaAuthClient";
import { createWalletVerifyAttempt } from "@/lib/wallet/walletVerifyAttempt";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function PassportSolanaSignInButton({
  intendedAction = HOLDER_AUTH_ACTIONS.passportSignIn,
  onSuccess,
  label,
}: {
  intendedAction?: typeof HOLDER_AUTH_ACTIONS.passportSignIn | typeof HOLDER_AUTH_ACTIONS.partnerVerify;
  onSuccess?: () => void;
  label?: string;
}) {
  const { publicKey, signMessage, connected } = useWallet();
  const [busy, setBusy] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const attemptRef = useRef<ReturnType<typeof createWalletVerifyAttempt> | null>(null);
  const address = publicKey?.toBase58() ?? null;

  const cancel = useCallback(() => {
    attemptRef.current?.invalidate();
    attemptRef.current = null;
    setBusy(false);
    setPhaseLabel(null);
  }, []);

  useEffect(() => {
    if (attemptRef.current) {
      cancel();
      setError("Wallet changed. Sign in again with the connected account.");
    }
    return () => attemptRef.current?.invalidate();
  }, [address, connected, cancel]);

  const authenticate = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setError("Connect a Solana wallet first.");
      return;
    }
    attemptRef.current?.invalidate();
    const attempt = createWalletVerifyAttempt();
    attemptRef.current = attempt;
    setBusy(true);
    setError(null);
    setPhaseLabel("Review signature in your wallet");

    const auth = await runPassportSolanaWalletAuth({
      walletAddress: publicKey.toBase58(),
      signMessage,
      intendedAction,
      attempt,
      onPhase: (phase) => setPhaseLabel(phase === "verify" ? "Verifying signature…" : "Review signature in your wallet"),
    });

    if (attempt.isStale()) return;

    setBusy(false);
    setPhaseLabel(null);
    attemptRef.current = null;

    if (!auth.ok) {
      if (auth.code === "aborted" || auth.code === "stale") return;
      setError(describeWalletVerifyRecoveryCode(auth.code, auth.phase));
      return;
    }
    onSuccess?.();
  }, [publicKey, signMessage, intendedAction, onSuccess]);

  return (
    <div>
      <button
        type="button"
        disabled={busy || !connected}
        onClick={() => void authenticate()}
        style={{
          padding: "0.65rem 1rem",
          borderRadius: 10,
          border: "none",
          background: "#14F195",
          color: "#04110c",
          fontFamily: FONT,
          fontWeight: 700,
          cursor: busy ? "wait" : "pointer",
          width: "100%",
        }}
      >
        {busy ? (phaseLabel ?? "Waiting for wallet…") : (label ?? "Sign in with Solana wallet")}
      </button>
      {busy ? (
        <button
          type="button"
          onClick={cancel}
          style={{
            marginTop: "0.35rem",
            padding: 0,
            border: "none",
            background: "transparent",
            color: "var(--text-secondary)",
            fontFamily: FONT,
            fontSize: "0.72rem",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Cancel and try again
        </button>
      ) : null}
      {error ? <p style={{ color: "#E0524F", fontSize: "0.72rem" }}>{error}</p> : null}
    </div>
  );
}
