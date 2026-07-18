// FILE: lib/assetMonitoring/evaluate.ts
// Maps material asset signals → credential actions (fail-closed by default).

import type { AssetSignal, MonitoringAction, MonitoringDecision } from "./types";

const SIGNAL_RULES: Record<
  AssetSignal["signalType"],
  { action: MonitoringAction; claimStatus?: "under_review" | "revoked" | "suspended"; reasonCode: string; summary: string; failClosed: boolean }
> = {
  ownership_transfer: {
    action: "refresh",
    claimStatus: "under_review",
    reasonCode: "asset.ownership_transfer",
    summary: "Ownership changed — title and owner-scoped claims require refresh before reuse.",
    failClosed: true,
  },
  lien_recorded: {
    action: "suspend",
    claimStatus: "suspended",
    reasonCode: "asset.lien_recorded",
    summary: "New encumbrance recorded — encumbrance claims suspended until re-attested.",
    failClosed: true,
  },
  appraisal_expired: {
    action: "refresh",
    claimStatus: "under_review",
    reasonCode: "asset.appraisal_expired",
    summary: "Valuation TTL expired — collateral claims need updated attestation.",
    failClosed: true,
  },
  identity_ttl_expired: {
    action: "refresh",
    claimStatus: "under_review",
    reasonCode: "identity.ttl_expired",
    summary: "Identity or screening TTL expired — person-level claims require re-verification.",
    failClosed: true,
  },
  listing_status_change: {
    action: "review",
    claimStatus: "under_review",
    reasonCode: "asset.listing_status_change",
    summary: "Listing or registry state changed — operator review before counterparties rely on proof.",
    failClosed: true,
  },
  manual_operator_flag: {
    action: "review",
    claimStatus: "under_review",
    reasonCode: "asset.manual_review",
    summary: "Operator flagged material change — credentials held for review.",
    failClosed: true,
  },
};

export function evaluateAssetSignal(signal: AssetSignal): MonitoringDecision {
  const rule = SIGNAL_RULES[signal.signalType];
  return {
    action: rule.action,
    claimStatus: rule.claimStatus,
    reasonCode: rule.reasonCode,
    summary: rule.summary,
    failClosed: rule.failClosed,
  };
}

export function monitoringActionToClaimStatus(
  decision: MonitoringDecision,
): "under_review" | "revoked" | "suspended" | null {
  if (decision.action === "noop") return null;
  if (decision.action === "revoke") return "revoked";
  return decision.claimStatus ?? "under_review";
}
