"use client";
// FILE: app/developers/integration-studio/OptionalWalletConnectionsPanel.tsx
// Optional message-proof bindings for a created sandbox. Never gates sandbox creation.

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
import {
  EVM_WALLET_NO_TRANSACTION,
  EVM_WALLET_NOT_IDENTITY,
  type EvmWalletBindView,
  type EvmWalletChallengeView,
} from "@/lib/partner/evmWalletBinding/contract";
import {
  connectEvmWalletInjected,
  signEvmPersonalMessage,
} from "@/lib/walletAuthority/client/ethereumProvider";

const body: React.CSSProperties = {
  fontFamily: ABRAXAS_FONT_SANS,
  fontSize: "0.82rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: 0,
};

function failureMessage(status: string, wallet: "Solana" | "EVM"): string {
  if (status === "store_unavailable") return `${wallet} binding is temporarily unavailable. Your sandbox is still ready.`;
  if (status === "wrong_origin") return "This page origin is not approved for wallet binding.";
  if (status === "expired") return "The request expired. Try connecting again.";
  if (status === "invalid_signature") return "The wallet signature could not be verified.";
  return `${wallet} could not be connected. Your sandbox is still ready.`;
}

function BindingStatus({ binding }: { binding: WalletStandardBindView | EvmWalletBindView | null }) {
  if (!binding?.binding_ref) return null;
  return (
    <p style={{ ...body, marginTop: "0.55rem" }}>
      Binding <code style={{ fontFamily: ABRAXAS_FONT_MONO }}>{binding.binding_ref}</code>
      {binding.expires_at ? ` · expires ${new Date(binding.expires_at).toLocaleTimeString()}` : ""}
    </p>
  );
}

export function OptionalWalletConnectionsPanel({
  applicationId,
  partnerId,
  policyId,
  policyVersion,
}: {
  applicationId: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
}) {
  const [solanaBusy, setSolanaBusy] = useState(false);
  const [solanaBinding, setSolanaBinding] = useState<WalletStandardBindView | null>(null);
  const [solanaNotice, setSolanaNotice] = useState("");
  const [evmBusy, setEvmBusy] = useState(false);
  const [evmBinding, setEvmBinding] = useState<EvmWalletBindView | null>(null);
  const [evmNotice, setEvmNotice] = useState("");

  async function connectSolanaWallet() {
    setSolanaBusy(true);
    setSolanaBinding(null);
    setSolanaNotice("");
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
        setSolanaNotice(failureMessage(challenge.status ?? "invalid", "Solana"));
        return;
      }

      const signed = await signWalletStandardChallenge(challenge.message);
      if (!signed.ok) {
        setSolanaNotice("No compatible Solana wallet was found. Install or unlock Phantom, then try again.");
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
        setSolanaNotice(failureMessage(result.status, "Solana"));
        return;
      }
      setSolanaBinding(result);
      setSolanaNotice("Solana wallet control verified for this sandbox action.");
    } catch {
      setSolanaNotice("Connection was cancelled or could not finish. Your sandbox is still ready.");
    } finally {
      setSolanaBusy(false);
    }
  }

  async function connectEvmWallet() {
    setEvmBusy(true);
    setEvmBinding(null);
    setEvmNotice("");
    const contract = {
      partner_id: partnerId,
      policy_id: policyId,
      policy_version: policyVersion,
      action_type: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      nonce: `studio:${applicationId}:evm-wallet-binding:v1`,
      network_context: { network_id: "evm_sandbox" },
    };

    try {
      const connection = await connectEvmWalletInjected();
      const challengeResponse = await fetch("/api/evm-wallet-binding/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contract }),
      });
      const challenge = await challengeResponse.json() as EvmWalletChallengeView & {
        ok?: boolean;
        status?: string;
      };
      if (!challengeResponse.ok || !challenge.challenge_id || !challenge.message) {
        setEvmNotice(failureMessage(challenge.status ?? "invalid", "EVM"));
        return;
      }

      const signature = await signEvmPersonalMessage(
        connection.provider,
        challenge.message,
        connection.address,
      );
      const bindResponse = await fetch("/api/evm-wallet-binding/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          challenge_id: challenge.challenge_id,
          message: challenge.message,
          signature,
          contract,
        }),
      });
      const result = await bindResponse.json() as EvmWalletBindView;
      if (!bindResponse.ok || !result.ok) {
        setEvmNotice(failureMessage(result.status, "EVM"));
        return;
      }
      setEvmBinding(result);
      setEvmNotice("EVM wallet control verified for this sandbox action.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setEvmNotice(message.includes("No injected wallet")
        ? "No browser EVM wallet was found. Install or unlock MetaMask, then try again."
        : "Connection was cancelled or could not finish. Your sandbox is still ready.");
    } finally {
      setEvmBusy(false);
    }
  }

  return (
    <ContentCard title="Optional · Connect a wallet">
      <p style={{ ...body, color: "var(--text-primary)", marginBottom: "0.8rem" }}>
        Add wallet control to this sandbox with one signed message. Choose either network or skip this step.
      </p>

      <div style={{ display: "grid", gap: "0.65rem" }}>
        <section style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "0.75rem" }}>
          <p style={{ ...body, color: "var(--text-primary)", fontWeight: 800, marginBottom: "0.55rem" }}>
            Solana · Phantom or Wallet Standard
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.65rem" }}>
            <Btn
              size="sm"
              loading={solanaBusy}
              disabled={solanaBusy || solanaBinding?.ok === true}
              onClick={() => void connectSolanaWallet()}
            >
              {solanaBinding?.ok ? "Solana connected" : "Connect Solana wallet"}
            </Btn>
            <span aria-live="polite" style={{ ...body, color: solanaBinding?.ok ? "var(--accent)" : "var(--text-secondary)" }}>
              {solanaNotice}
            </span>
          </div>
          <BindingStatus binding={solanaBinding} />
        </section>

        <section style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "0.75rem" }}>
          <p style={{ ...body, color: "var(--text-primary)", fontWeight: 800, marginBottom: "0.55rem" }}>
            EVM · MetaMask or browser wallet
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.65rem" }}>
            <Btn
              size="sm"
              loading={evmBusy}
              disabled={evmBusy || evmBinding?.ok === true}
              onClick={() => void connectEvmWallet()}
            >
              {evmBinding?.ok ? "EVM connected" : "Connect EVM wallet"}
            </Btn>
            <span aria-live="polite" style={{ ...body, color: evmBinding?.ok ? "var(--accent)" : "var(--text-secondary)" }}>
              {evmNotice}
            </span>
          </div>
          <BindingStatus binding={evmBinding} />
        </section>
      </div>

      <details style={{ marginTop: "0.75rem" }}>
        <summary style={{ ...body, cursor: "pointer", fontWeight: 800, color: "var(--accent)" }}>
          What connecting does
        </summary>
        <p style={{ ...body, marginTop: "0.6rem" }}>{WALLET_STANDARD_NOT_IDENTITY}</p>
        <p style={{ ...body, marginTop: "0.45rem" }}>{WALLET_STANDARD_NO_WALLET_PRODUCT}</p>
        <p style={{ ...body, marginTop: "0.45rem" }}>{EVM_WALLET_NOT_IDENTITY}</p>
        <p style={{ ...body, marginTop: "0.45rem" }}>{EVM_WALLET_NO_TRANSACTION}</p>
      </details>
    </ContentCard>
  );
}
