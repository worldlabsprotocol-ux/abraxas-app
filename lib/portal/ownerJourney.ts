// FILE: lib/portal/ownerJourney.ts
// End-to-end owner journey: wallet → verified asset → deal ready → USDC settlement.

import type { ApplicationLifecycle } from "./applicationStatus";
import { buildApplicationLifecycle } from "./applicationStatus";

export type DealStatus = "intake" | "review" | "verified" | "deal_ready" | "settled";

export interface OwnerJourneyStep {
  id: string;
  label: string;
  detail: string;
  complete: boolean;
  current: boolean;
  action?: {
    label: string;
    href: string;
  };
}

export interface OwnerApplicationFields {
  id: string;
  status: string;
  asset_name: string;
  asset_class: string;
  jurisdiction?: string | null;
  evidence_scope?: string | null;
  contact_email?: string | null;
  contact_wallet?: string | null;
  named_reviewer?: string | null;
  review_signed_at?: string | null;
  public_verify_slug?: string | null;
  created_at?: string | null;
  linked_wallet?: string | null;
  wallet_linked_at?: string | null;
  deal_status?: string | null;
  settlement_amount_usdc?: number | null;
  settlement_tx_digest?: string | null;
  settlement_verified_at?: string | null;
  deal_ready_at?: string | null;
  is_demo_sample?: boolean | null;
}

export interface OwnerJourney {
  application_id: string;
  asset_name: string;
  deal_status: DealStatus;
  wallet_linked: boolean;
  wallet_address: string | null;
  verified: boolean;
  deal_ready: boolean;
  settled: boolean;
  settlement_amount_usdc: number | null;
  settlement_tx_digest: string | null;
  verify_url: string | null;
  application_lifecycle: ApplicationLifecycle;
  steps: OwnerJourneyStep[];
  passport_return_url: string;
  settle_url: string | null;
}

export function normalizeDealStatus(raw: string | null | undefined): DealStatus {
  if (raw === "review" || raw === "verified" || raw === "deal_ready" || raw === "settled") return raw;
  return "intake";
}

export function buildOwnerJourney(
  row: OwnerApplicationFields,
  sessionWallet?: string | null,
): OwnerJourney {
  const applicationId = row.id;
  const email = row.contact_email ?? "";
  const lifecycle = buildApplicationLifecycle(applicationId, row);
  const verified = lifecycle.verified;
  const dealStatus = normalizeDealStatus(row.deal_status);
  const walletAddress = row.linked_wallet?.trim() || row.contact_wallet?.trim() || null;
  const walletLinked = Boolean(walletAddress);
  const sessionMatches = Boolean(
    sessionWallet && walletAddress &&
    sessionWallet.toLowerCase() === walletAddress.toLowerCase(),
  );
  const settled = dealStatus === "settled" || Boolean(row.settlement_verified_at);
  const amount = row.settlement_amount_usdc != null ? Number(row.settlement_amount_usdc) : null;
  const dealReady = dealStatus === "deal_ready" || dealStatus === "settled" ||
    (verified && amount != null && amount > 0 && dealStatus !== "intake");

  const baseQuery = new URLSearchParams({
    application_id: applicationId,
    email,
  });
  const journeyUrl = `/portal/journey?${baseQuery.toString()}`;
  const passportReturn = `/passport?return=${encodeURIComponent(journeyUrl)}`;
  const settleUrl = dealReady && amount
    ? `/portal/settle?${baseQuery.toString()}`
    : null;

  const walletComplete = walletLinked && (sessionMatches || !sessionWallet);
  const verificationComplete = verified;
  const dealReadyComplete = dealReady || settled;
  const settlementComplete = settled;

  const steps: OwnerJourneyStep[] = [
    {
      id: "apply",
      label: "Application on file",
      detail: row.created_at
        ? `Intake submitted — evidence scope defined once for all counterparties.`
        : "Your land or mineral intake is recorded.",
      complete: true,
      current: false,
    },
    {
      id: "wallet",
      label: "Passport & wallet connected",
      detail: walletComplete
        ? `Settlement wallet ${shortAddr(walletAddress!)} — zkLogin or bound Sui address.`
        : "Sign in on Passport and bind the wallet that will receive or send USDC on Sui.",
      complete: walletComplete,
      current: !walletComplete,
      action: walletComplete ? undefined : {
        label: "Connect wallet on Passport →",
        href: passportReturn,
      },
    },
    {
      id: "verify",
      label: "Asset verified on registry",
      detail: verificationComplete && lifecycle.verify_url
        ? `Public record live — partners check ${row.public_verify_slug} without your document folder.`
        : "Named reviewer sign-off publishes your verify URL when evidence scope is approved.",
      complete: verificationComplete,
      current: walletComplete && !verificationComplete,
      action: lifecycle.verify_url ? {
        label: "View verify record →",
        href: lifecycle.verify_url,
      } : undefined,
    },
    {
      id: "deal_ready",
      label: "Deal ready to act",
      detail: dealReadyComplete
        ? amount
          ? `Counterparty cleared — up to ${amount} USDC can move on-chain with verification gates.`
          : "Deal marked ready — settlement amount configured by Abraxas."
        : "When verification completes, Abraxas marks the deal ready for stablecoin settlement.",
      complete: dealReadyComplete,
      current: verificationComplete && !dealReadyComplete,
    },
    {
      id: "settle",
      label: "USDC settlement on Sui",
      detail: settlementComplete
        ? `Captured on-chain${row.settlement_tx_digest ? ` · ${row.settlement_tx_digest.slice(0, 12)}…` : ""}.`
        : dealReady && amount
          ? "Circle USDC on Sui — one-click from your Passport wallet, verified before capture."
          : "Stablecoin rail uses the same treasury verification as Cielo Sunrise.",
      complete: settlementComplete,
      current: dealReadyComplete && !settlementComplete,
      action: settleUrl && !settlementComplete ? {
        label: "Move USDC →",
        href: settleUrl,
      } : row.settlement_tx_digest ? {
        label: "View on explorer →",
        href: `/transparency`,
      } : undefined,
    },
  ];

  return {
    application_id: applicationId,
    asset_name: row.asset_name,
    deal_status: settled ? "settled" : dealReady ? "deal_ready" : verified ? "verified" : dealStatus,
    wallet_linked: walletLinked,
    wallet_address: walletAddress,
    verified,
    deal_ready: dealReady,
    settled,
    settlement_amount_usdc: amount,
    settlement_tx_digest: row.settlement_tx_digest ?? null,
    verify_url: lifecycle.verify_url,
    application_lifecycle: lifecycle,
    steps,
    passport_return_url: passportReturn,
    settle_url: settleUrl,
  };
}

function shortAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
