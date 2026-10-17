"use client";
// FILE: components/passport/PassportSolanaSignInButton.tsx

import { useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { HOLDER_AUTH_ACTIONS } from "@/lib/auth/holderSubject/contract";
import { describeHolderAuthErrorCode } from "@/lib/auth/holderAuthErrorCopy";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function PassportSolanaSignInButton({
  intendedAction = HOLDER_AUTH_ACTIONS.passportSignIn,
  onSuccess,
}: {
  intendedAction?: typeof HOLDER_AUTH_ACTIONS.passportSignIn | typeof HOLDER_AUTH_ACTIONS.partnerVerify;
  onSuccess?: () => void;
}) {
  const { publicKey, signMessage, connected } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticate = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setError("Connect a Solana wallet first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const walletAddress = publicKey.toBase58();
      const solanaNetwork = process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet";
      const challengeRes = await fetch("/api/auth/passport-solana/challenge", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          wallet_address: walletAddress,
          solana_network: solanaNetwork,
          intended_action: intendedAction,
        }),
      });
      const challengeBody = await challengeRes.json() as {
        ok?: boolean;
        challenge?: { challenge_id: string; message: string };
        code?: string;
      };
      if (!challengeRes.ok || !challengeBody.challenge) {
        setError(describeHolderAuthErrorCode(challengeBody.code ?? "challenge_failed"));
        return;
      }
      const messageBytes = new TextEncoder().encode(challengeBody.challenge.message);
      const signatureBytes = await signMessage(messageBytes);
      const signature = Buffer.from(signatureBytes).toString("base64");

      const verifyRes = await fetch("/api/auth/passport-solana/verify", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          challenge_id: challengeBody.challenge.challenge_id,
          wallet_address: walletAddress,
          solana_network: solanaNetwork,
          signature,
          intended_action: intendedAction,
        }),
      });
      const verifyBody = await verifyRes.json() as { ok?: boolean; code?: string };
      if (!verifyRes.ok || !verifyBody.ok) {
        setError(describeHolderAuthErrorCode(verifyBody.code ?? "verify_failed"));
        return;
      }
      window.dispatchEvent(new Event("abraxas:holder-session"));
      onSuccess?.();
    } finally {
      setBusy(false);
    }
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
        {busy ? "Authenticating…" : "Sign in with Solana wallet"}
      </button>
      {error ? <p style={{ color: "#E0524F", fontSize: "0.72rem" }}>{error}</p> : null}
    </div>
  );
}
