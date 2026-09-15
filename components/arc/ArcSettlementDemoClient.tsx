"use client";
// FILE: components/arc/ArcSettlementDemoClient.tsx
// Abraxas hosted Arc Testnet settlement demonstration.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createWalletClient, custom, encodeFunctionData, type Hex } from "viem";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { connectEvmWalletInjected, getEthereumProvider } from "@/lib/walletAuthority/client/ethereumProvider";
import { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_USDC_ERC20 } from "@/lib/settlement/constants";
import { PROOF_GATED_SETTLEMENT_ABI } from "@/lib/settlement/contractAbi";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

const ARC_CHAIN_HEX = `0x${ARC_TESTNET_CHAIN_ID.toString(16)}`;

const ERC20_APPROVE_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

type DemoStep =
  | "connect"
  | "review"
  | "verify"
  | "disclosure"
  | "authorize"
  | "approve"
  | "settle"
  | "complete"
  | "error";

interface PublicConfig {
  application: {
    public_slug: string;
    display_name: string;
    policy_template_label: string;
    user_explanation: string;
    partner_id: string;
    policy_id: string;
  };
  settlement: {
    chain_id: number;
    contract_address: string;
    usdc_token_address: string;
    approved_recipient: string;
    minimum_amount_micro_usdc: number;
    maximum_amount_micro_usdc: number;
    explorer_url: string;
  };
  disclosure: {
    proves: string;
    shared: string;
    not_shared: string;
    funds_notice: string;
  };
}

export function ArcSettlementDemoClient({ appSlug }: { appSlug: string }) {
  const [step, setStep] = useState<DemoStep>("connect");
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const [authorization, setAuthorization] = useState<Record<string, unknown> | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [demoAmount, setDemoAmount] = useState("0.01");

  const amountMicro = useMemo(() => {
    const parsed = parseFloat(demoAmount);
    if (!Number.isFinite(parsed)) return 0;
    return Math.round(parsed * 1_000_000);
  }, [demoAmount]);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/launchpad/public/settlement-config?app=${encodeURIComponent(appSlug)}`);
      const data = await res.json();
      if (res.ok) setConfig(data);
      else setError(data.error ?? data.code ?? "Configuration unavailable");
    })();
  }, [appSlug]);

  const switchToArcTestnet = useCallback(async () => {
    const provider = getEthereumProvider();
    if (!provider) throw new Error("No wallet found");
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ARC_CHAIN_HEX }],
      });
    } catch {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: ARC_CHAIN_HEX,
          chainName: "Arc Testnet",
          nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
          rpcUrls: ["https://rpc.testnet.arc.network"],
          blockExplorerUrls: ["https://testnet.arcscan.app"],
        }],
      });
    }
  }, []);

  async function connectWallet() {
    setError("");
    try {
      await switchToArcTestnet();
      const connection = await connectEvmWalletInjected();
      if (connection.chainId !== ARC_TESTNET_CHAIN_ID) {
        await switchToArcTestnet();
      }
      setWallet(connection.address);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet connection failed");
      setStep("error");
    }
  }

  function beginVerification() {
    if (!config) return;
    const verifyUrl = new URL("/partner/verify", window.location.origin);
    verifyUrl.searchParams.set("app", config.application.public_slug);
    verifyUrl.searchParams.set("return_url", window.location.href);
    window.location.assign(verifyUrl.toString());
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnedReceipt = params.get("receipt_id");
    if (returnedReceipt) {
      setReceiptId(returnedReceipt);
      setStep("disclosure");
    }
  }, []);

  async function requestAuthorization() {
    if (!config || !wallet || !receiptId) return;
    setError("");
    setStep("authorize");
    const res = await fetch("/api/launchpad/public/settlement/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        app: config.application.public_slug,
        receipt_id: receiptId,
        eligible_wallet: wallet,
        amount_micro_usdc: String(amountMicro),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? data.code ?? "Authorization failed");
      setStep("error");
      return;
    }
    setAuthorization(data.authorization);
    setStep("approve");
  }

  async function approveAndSettle() {
    if (!config || !wallet || !authorization) return;
    setError("");
    const provider = getEthereumProvider();
    if (!provider) {
      setError("Wallet disconnected");
      return;
    }

    const client = createWalletClient({
      account: wallet as Hex,
      transport: custom(provider),
    });

    const token = config.settlement.usdc_token_address as Hex;
    const contract = config.settlement.contract_address as Hex;
    const amount = BigInt(String(authorization.amount_micro_usdc));

    try {
      const approveData = encodeFunctionData({
        abi: ERC20_APPROVE_ABI,
        functionName: "approve",
        args: [contract, amount],
      });
      await client.sendTransaction({
        to: token,
        data: approveData,
        chain: null,
      });

      const typed = authorization.typed_data as {
        message: Record<string, unknown>;
      };
      const authTuple = {
        chainId: BigInt(String(typed.message.chainId)),
        environment: Number(typed.message.environment),
        partnerApplicationId: typed.message.partnerApplicationId as Hex,
        partnerIdHash: typed.message.partnerIdHash as Hex,
        policyIdHash: typed.message.policyIdHash as Hex,
        policyVersion: BigInt(String(typed.message.policyVersion)),
        eligibleWallet: typed.message.eligibleWallet as Hex,
        recipient: typed.message.recipient as Hex,
        token: typed.message.token as Hex,
        amountMicroUsdc: BigInt(String(typed.message.amountMicroUsdc)),
        amountKind: Number(typed.message.amountKind),
        actionType: typed.message.actionType as Hex,
        nonce: typed.message.nonce as Hex,
        issuedAt: BigInt(String(typed.message.issuedAt)),
        expiresAt: BigInt(String(typed.message.expiresAt)),
        receiptCommitment: typed.message.receiptCommitment as Hex,
        settlementReference: typed.message.settlementReference as Hex,
      };

      const settleData = encodeFunctionData({
        abi: PROOF_GATED_SETTLEMENT_ABI,
        functionName: "settle",
        args: [authTuple, authorization.signature as Hex, amount],
      });

      setStep("settle");
      const hash = await client.sendTransaction({
        to: contract,
        data: settleData,
        chain: null,
      });
      setTxHash(hash);
      const explorer = `${config.settlement.explorer_url}/tx/${hash}`;
      setExplorerUrl(explorer);
      setStep("complete");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Settlement transaction failed");
      setStep("error");
    }
  }

  return (
    <RedesignPage accent="developer" maxWidth={720}>
      <PageHeader
        eyebrow="Arc Testnet TESTNET"
        title="Proof gated USDC settlement"
        subtitle="Complete Abraxas verification, review what will be shared, then settle test USDC on Arc Testnet. These funds have no real value."
      />

      <div style={testnetBannerStyle}>Arc Testnet demonstration. No real money.</div>

      {error && <p role="alert" style={{ color: "#ef4444", fontFamily: FONT, fontSize: "0.72rem" }}>{error}</p>}

      {step === "connect" && (
        <ContentCard title="1. Connect wallet">
          <p style={bodyText}>Connect an EVM wallet on Arc Testnet.</p>
          <Btn size="sm" onClick={() => void connectWallet()}>Connect wallet</Btn>
        </ContentCard>
      )}

      {step === "review" && config && (
        <ContentCard title="2. Review eligibility requirement">
          <p style={bodyText}>{config.application.user_explanation}</p>
          <p style={bodyText}>Policy: {config.application.policy_template_label}</p>
          <label style={labelStyle}>
            Settlement amount USDC
            <input value={demoAmount} onChange={(e) => setDemoAmount(e.target.value)} style={inputStyle} />
          </label>
          <p style={bodyText}>Recipient: <code style={{ fontFamily: MONO }}>{config.settlement.approved_recipient}</code></p>
          <Btn size="sm" onClick={beginVerification}>Complete Abraxas proof</Btn>
        </ContentCard>
      )}

      {step === "disclosure" && config && (
        <ContentCard title="4. Review disclosure">
          <p style={bodyText}>You are proving: {config.disclosure.proves}</p>
          <p style={bodyText}>Shared with settlement: {config.disclosure.shared}</p>
          <p style={bodyText}>Not shared: {config.disclosure.not_shared}</p>
          <p style={bodyText}>{config.disclosure.funds_notice}</p>
          <Btn size="sm" onClick={() => void requestAuthorization()}>Generate authorization</Btn>
        </ContentCard>
      )}

      {(step === "approve" || step === "settle") && authorization && (
        <ContentCard title="6. Approve Arc Testnet USDC transfer">
          <p style={bodyText}>
            Amount: {demoAmount} USDC · Expires: {String(authorization.expires_at)}
          </p>
          <Btn size="sm" onClick={() => void approveAndSettle()} disabled={step === "settle"}>
            {step === "settle" ? "Submitting…" : "Approve and settle"}
          </Btn>
        </ContentCard>
      )}

      {step === "complete" && txHash && (
        <ContentCard title="8. Settlement complete">
          <p style={bodyText}>Transaction confirmed on Arc Testnet.</p>
          <pre style={codeStyle}>{txHash}</pre>
          {explorerUrl && (
            <a href={explorerUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontFamily: FONT }}>
              View on Arc explorer
            </a>
          )}
          <p style={{ ...bodyText, marginTop: "0.75rem" }}>
            <Link href="/developers/launchpad" style={{ color: "var(--accent)" }}>Return to Partner Launchpad</Link>
          </p>
        </ContentCard>
      )}

      {!config && !error && <p style={bodyText}>Loading Arc Testnet configuration…</p>}
    </RedesignPage>
  );
}

const bodyText: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.78rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: "0 0 0.75rem",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: "0.35rem",
  fontFamily: FONT,
  fontSize: "0.72rem",
  fontWeight: 700,
  marginBottom: "0.65rem",
};

const inputStyle: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: "0.72rem",
  padding: "0.55rem 0.65rem",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface-inset)",
  color: "var(--text-primary)",
};

const codeStyle: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: "0.62rem",
  wordBreak: "break-all",
  padding: "0.75rem",
  borderRadius: 8,
  background: "var(--surface-inset)",
  border: "1px solid var(--border)",
};

const testnetBannerStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.68rem",
  fontWeight: 700,
  color: "#f59e0b",
  background: "rgba(245,158,11,0.12)",
  border: "1px solid rgba(245,158,11,0.35)",
  borderRadius: 8,
  padding: "0.4rem 0.65rem",
  marginBottom: "0.75rem",
};
