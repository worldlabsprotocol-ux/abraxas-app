"use client";
// FILE: app/developers/integration-studio/OptionalSolanaWalletPanel.tsx
// Optional proof-of-control binding for a created sandbox. Never gates sandbox creation.

import { useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  WALLET_STANDARD_NO_WALLET_PRODUCT,
  WALLET_STANDARD_NOT_IDENTITY,
  type WalletStandardBindView,
  type WalletStandardChallengeView,
} from "@/lib/partner/walletStandard/contract";
import { signWalletStandardChallenge } from "@/lib/partner/walletStandard/connector";

const body: React.CSSProperties = {
  fontFamily: ABRAXAS_FONT_SANS,
  fontSize: "0.82rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: 0,
};

function failureMessage(status: string): string {
  if (status === "store_unavailable") return "Wallet binding is temporarily unavailable. Your sandbox is still ready.";
  if (status === "wrong_origin") return "This page origin is not approved for wallet binding.";
  if (status === "expired") return "The request expired. Try connecting again.";
  if (status === "invalid_signature") return "The wallet signature could not be verified.";
  return "The wallet could not be connected. Your sandbox is still ready.";
}

export function OptionalSolanaWalletPanel({
  applicationId,
  partnerId,
}: {
  applicationId: string;
  partnerId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [binding, setBinding] = useState<WalletStandardBindView | null>(null);
  const [notice, setNotice] = useState("");

  async function connectWallet() {
    setBusy(true);
    setBinding(null);
    setNotice("");
    const actionContractNonce = `studio:${applicationId}:wallet-binding:v1`;

    try {
      const challengeResponse = await fetch("/api/wallet-standard/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          partner_id: partnerId,
          action_contract_nonce: actionContractNonce,
        }),
      });
      const challenge = await challengeResponse.json() as WalletStandardChallengeView & {
        ok?: boolean;
        status?: string;
      };
      if (!challengeResponse.ok || !challenge.challenge_id || !challenge.message) {
        setNotice(failureMessage(challenge.status ?? "invalid"));
        return;
      }

      const signed = await signWalletStandardChallenge(challenge.message);
      if (!signed.ok) {
        setNotice("No compatible Solana wallet was found. Install or unlock Phantom, then try again.");
        return;
      }

      const bindResponse = await fetch("/api/wallet-standard/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          challenge_id: challenge.challenge_id,
          partner_id: partnerId,
          action_contract_nonce: actionContractNonce,
          message: challenge.message,
          signature: signed.signature,
          public_key: signed.publicKey,
        }),
      });
      const result = await bindResponse.json() as WalletStandardBindView;
      if (!bindResponse.ok || !result.ok) {
        setNotice(failureMessage(result.status));
        return;
      }
      setBinding(result);
      setNotice("Wallet control verified for this sandbox action.");
    } catch {
      setNotice("Connection was cancelled or could not finish. Your sandbox is still ready.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ContentCard title="Optional · Connect a Solana wallet">
      <p style={{ ...body, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
        Prove wallet control for this sandbox with one signed message. No transaction or balance access.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.65rem" }}>
        <Btn size="sm" loading={busy} disabled={busy || binding?.ok === true} onClick={() => void connectWallet()}>
          {binding?.ok ? "Wallet connected" : "Connect Phantom or Solana wallet"}
        </Btn>
        <span aria-live="polite" style={{ ...body, color: binding?.ok ? "var(--accent)" : "var(--text-secondary)" }}>
          {notice}
        </span>
      </div>
      {binding?.binding_ref && (
        <p style={{ ...body, marginTop: "0.65rem" }}>
          Binding <code style={{ fontFamily: ABRAXAS_FONT_MONO }}>{binding.binding_ref}</code>
          {binding.expires_at ? ` · expires ${new Date(binding.expires_at).toLocaleTimeString()}` : ""}
        </p>
      )}
      <details style={{ marginTop: "0.75rem" }}>
        <summary style={{ ...body, cursor: "pointer", fontWeight: 800, color: "var(--accent)" }}>
          What connecting does
        </summary>
        <p style={{ ...body, marginTop: "0.6rem" }}>{WALLET_STANDARD_NOT_IDENTITY}</p>
        <p style={{ ...body, marginTop: "0.45rem" }}>{WALLET_STANDARD_NO_WALLET_PRODUCT}</p>
      </details>
    </ContentCard>
  );
}
