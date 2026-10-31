"use client";
// FILE: components/passport/HolderWalletAuthPanel.tsx

import { useState } from "react";
import { PassportWalletSignInButton } from "@/components/sui/PassportWalletSignInButton";
import { PassportSolanaSignInButton } from "./PassportSolanaSignInButton";
import { PassportSolanaWalletConnection } from "./PassportSolanaWalletConnection";
import { WalletVerifyControlPanel } from "@/components/wallet/WalletVerifyControlPanel";
import { PASSPORT_WALLET_ACTIONS, type PassportWalletIntendedAction } from "@/lib/auth/passportWalletAuth/contract";
import { HOLDER_AUTH_ACTIONS } from "@/lib/auth/holderSubject/contract";
import { HOLDER_WALLET_BOUNDARY } from "@/lib/sui/holderAccessCopy";
import { describeHolderAuthErrorCode } from "@/lib/auth/holderAuthErrorCopy";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

async function signInEvmWallet(intendedAction: string): Promise<{ ok: boolean; code?: string }> {
  const eth = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
  if (!eth) return { ok: false, code: "no_evm_provider" };
  const accounts = await eth.request({ method: "eth_requestAccounts" }) as string[];
  const wallet = accounts[0];
  if (!wallet) return { ok: false, code: "no_account" };
  const chainHex = await eth.request({ method: "eth_chainId" }) as string;
  const chainId = Number.parseInt(chainHex, 16);

  const challengeRes = await fetch("/api/auth/passport-evm/challenge", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      wallet_address: wallet,
      chain_id: chainId,
      intended_action: intendedAction,
    }),
  });
  const challengeBody = await challengeRes.json() as { ok?: boolean; challenge?: { challenge_id: string; message: string }; code?: string };
  if (!challengeRes.ok || !challengeBody.challenge) return { ok: false, code: challengeBody.code ?? "challenge_failed" };

  const signature = await eth.request({
    method: "personal_sign",
    params: [challengeBody.challenge.message, wallet],
  }) as string;

  const verifyRes = await fetch("/api/auth/passport-evm/verify", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      challenge_id: challengeBody.challenge.challenge_id,
      wallet_address: wallet,
      chain_id: chainId,
      signature,
      intended_action: intendedAction,
    }),
  });
  const verifyBody = await verifyRes.json() as { ok?: boolean; code?: string };
  if (!verifyRes.ok || !verifyBody.ok) return { ok: false, code: verifyBody.code ?? "verify_failed" };
  window.dispatchEvent(new Event("abraxas:holder-session"));
  return { ok: true };
}

export function HolderWalletAuthPanel({
  intendedAction = PASSPORT_WALLET_ACTIONS.passportSignIn,
  compact = false,
  onSuccess,
  secondaryMode = false,
}: {
  intendedAction?: PassportWalletIntendedAction;
  compact?: boolean;
  onSuccess?: () => void;
  /** When true, de-emphasize wallet paths (Passport entry secondary). */
  secondaryMode?: boolean;
}) {
  const [evmBusy, setEvmBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSui, setShowSui] = useState(false);
  const evmIntendedAction = intendedAction === PASSPORT_WALLET_ACTIONS.partnerVerify
    ? HOLDER_AUTH_ACTIONS.partnerVerify
    : intendedAction === PASSPORT_WALLET_ACTIONS.linkLegacyWallet
      ? HOLDER_AUTH_ACTIONS.linkLegacyWallet
      : HOLDER_AUTH_ACTIONS.passportSignIn;

  if (intendedAction === PASSPORT_WALLET_ACTIONS.partnerVerify) {
    return <WalletVerifyControlPanel compact onSuccess={onSuccess} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
      <button
        type="button"
        disabled={evmBusy}
        onClick={() => {
          setEvmBusy(true);
          setError(null);
          void signInEvmWallet(evmIntendedAction)
            .then((r) => {
              if (!r.ok) setError(describeHolderAuthErrorCode(r.code ?? "evm_sign_in_failed"));
              else onSuccess?.();
            })
            .finally(() => setEvmBusy(false));
        }}
        style={{
          padding: compact ? "0.55rem 0.85rem" : "0.65rem 1rem",
          borderRadius: 10,
          border: "none",
          background: "#627EEA",
          color: "#fff",
          fontFamily: FONT,
          fontWeight: 700,
          cursor: evmBusy ? "wait" : "pointer",
        }}
      >
        {evmBusy ? "Authenticating…" : secondaryMode ? "EVM wallet" : "Sign in with EVM wallet"}
      </button>

      {secondaryMode ? (
        <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: 0 }}>
          Solana and Sui wallet sign-in available below when needed for your workflow.
        </p>
      ) : null}

      <PassportSolanaWalletConnection />
      <PassportSolanaSignInButton intendedAction="passport_sign_in" onSuccess={onSuccess} />

      <button type="button" onClick={() => setShowSui((v) => !v)} style={{
        fontFamily: FONT, fontSize: "0.76rem", background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", textAlign: "left",
      }}
      >
        {showSui ? "Hide" : "Show"} optional Sui wallet sign-in
      </button>

      {showSui ? <PassportWalletSignInButton intendedAction={intendedAction} compact={compact} onSuccess={onSuccess} /> : null}

      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.55 }}>
        {HOLDER_WALLET_BOUNDARY}
      </p>
      {error ? <p style={{ color: "#E0524F", fontSize: "0.72rem", margin: 0 }}>{error}</p> : null}
    </div>
  );
}
