// FILE: lib/services/eventService.ts
// Append-only event bus for the Abraxas protocol.
// All state transitions emit events. Events are never updated or deleted.
// Queryable as audit timeline per asset.

import { createAdminClient } from "@/lib/supabase";
import type { AssetEventType } from "@/lib/types/asset";

interface EmitEventParams {
  assetId:    string;
  eventType:  AssetEventType;
  actor:      string;
  actorName?: string;
  payload?:   Record<string, unknown>;
  txHash?:    string;
  blockTime?: Date;
}

// Core emit — always append, never replace
export async function emitAssetEvent(params: EmitEventParams): Promise<void> {
  const db = createAdminClient();
  if (!db) {
    // Log locally if Supabase not configured
    console.log(`[EVENT] ${params.eventType} | ${params.assetId} | ${params.actor}`);
    return;
  }

  await db.from("asset_events").insert({
    asset_id:   params.assetId,
    event_type: params.eventType,
    actor:      params.actor,
    actor_name: params.actorName ?? null,
    payload:    params.payload ?? {},
    tx_hash:    params.txHash ?? null,
    block_time: params.blockTime?.toISOString() ?? null,
    created_at: new Date().toISOString(),
  });
}

// Query asset timeline — ordered chronologically
export async function getAssetTimeline(assetId: string) {
  const db = createAdminClient();
  if (!db) return [];

  const { data } = await db
    .from("asset_events")
    .select("*")
    .eq("asset_id", assetId)
    .order("created_at", { ascending: true });

  return data ?? [];
}

// Named emitters for each event type — self-documenting call sites

export const Events = {
  assetSubmitted: (assetId: string, wallet: string, assetClass: string) =>
    emitAssetEvent({ assetId, eventType:"ASSET_SUBMITTED", actor:wallet,
      payload:{ assetClass } }),

  verifierAssigned: (assetId: string, partnerId: string, partnerName: string) =>
    emitAssetEvent({ assetId, eventType:"VERIFIER_ASSIGNED",
      actor:partnerId, actorName:partnerName,
      payload:{ partnerId, partnerName } }),

  documentUploaded: (assetId: string, wallet: string, docType: string, hash: string) =>
    emitAssetEvent({ assetId, eventType:"DOCUMENT_UPLOADED", actor:wallet,
      payload:{ docType, hash } }),

  provenanceValidated: (assetId: string, partnerId: string, recordCount: number) =>
    emitAssetEvent({ assetId, eventType:"PROVENANCE_VALIDATED", actor:partnerId,
      payload:{ recordCount } }),

  custodyConfirmed: (assetId: string, custodianId: string, vaultRef: string, location: string) =>
    emitAssetEvent({ assetId, eventType:"CUSTODY_CONFIRMED", actor:custodianId,
      payload:{ custodianId, vaultRef, location } }),

  custodyAuditCompleted: (assetId: string, custodianId: string, condition: string) =>
    emitAssetEvent({ assetId, eventType:"CUSTODY_AUDIT_COMPLETED", actor:custodianId,
      payload:{ condition, auditDate: new Date().toISOString() } }),

  riskScored: (assetId: string, score: number, tier: string, ltv: number) =>
    emitAssetEvent({ assetId, eventType:"RISK_SCORED", actor:"SYSTEM",
      payload:{ score, tier, ltv } }),

  fraudFlagRaised: (assetId: string, raisedBy: string, flagType: string, severity: string) =>
    emitAssetEvent({ assetId, eventType:"FRAUD_FLAG_RAISED", actor:raisedBy,
      payload:{ flagType, severity } }),

  fraudFlagResolved: (assetId: string, resolvedBy: string, resolution: string) =>
    emitAssetEvent({ assetId, eventType:"FRAUD_FLAG_RESOLVED", actor:resolvedBy,
      payload:{ resolution } }),

  verificationApproved: (assetId: string, verifierId: string, confidenceScore: number) =>
    emitAssetEvent({ assetId, eventType:"VERIFICATION_APPROVED", actor:verifierId,
      payload:{ confidenceScore } }),

  verificationRejected: (assetId: string, verifierId: string, reason: string) =>
    emitAssetEvent({ assetId, eventType:"VERIFICATION_REJECTED", actor:verifierId,
      payload:{ reason } }),

  tokenMinted: (assetId: string, wallet: string, mintAddress: string, tx: string) =>
    emitAssetEvent({ assetId, eventType:"TOKEN_MINTED", actor:wallet,
      payload:{ mintAddress }, txHash:tx }),

  collateralActivated: (assetId: string, ltv: number, maxBorrowUsdc: number) =>
    emitAssetEvent({ assetId, eventType:"COLLATERAL_ACTIVATED", actor:"SYSTEM",
      payload:{ ltv, maxBorrowUsdc } }),

  borrowPositionOpened: (assetId: string, wallet: string, principalUsdc: number, protocol: string) =>
    emitAssetEvent({ assetId, eventType:"BORROW_POSITION_OPENED", actor:wallet,
      payload:{ principalUsdc, protocol } }),

  borrowPositionClosed: (assetId: string, wallet: string, repaidUsdc: number) =>
    emitAssetEvent({ assetId, eventType:"BORROW_POSITION_CLOSED", actor:wallet,
      payload:{ repaidUsdc } }),

  liquidationTriggered: (assetId: string, healthFactor: number) =>
    emitAssetEvent({ assetId, eventType:"LIQUIDATION_TRIGGERED", actor:"SYSTEM",
      payload:{ healthFactor } }),

  valuationUpdated: (assetId: string, appraiserId: string, newValueUsd: number) =>
    emitAssetEvent({ assetId, eventType:"VALUATION_UPDATED", actor:appraiserId,
      payload:{ newValueUsd } }),
};

// Human-readable event labels for UI
export const EVENT_LABELS: Record<string, string> = {
  ASSET_SUBMITTED:            "Asset Submitted",
  VERIFIER_ASSIGNED:          "Verifier Assigned",
  DOCUMENT_UPLOADED:          "Document Uploaded",
  PROVENANCE_VALIDATED:       "Provenance Validated",
  CUSTODY_CONFIRMED:          "Custody Confirmed",
  CUSTODY_TRANSFERRED:        "Custody Transferred",
  CUSTODY_AUDIT_COMPLETED:    "Custody Audit Completed",
  RISK_SCORED:                "Risk Score Computed",
  FRAUD_FLAG_RAISED:          "Fraud Flag Raised",
  FRAUD_FLAG_RESOLVED:        "Fraud Flag Resolved",
  VERIFICATION_STAGE_PASSED:  "Verification Stage Passed",
  VERIFICATION_STAGE_FAILED:  "Verification Stage Failed",
  VERIFICATION_APPROVED:      "Verification Approved",
  VERIFICATION_REJECTED:      "Verification Rejected",
  TOKEN_MINTED:               "Certificate Minted On-Chain",
  COLLATERAL_ACTIVATED:       "Collateral Activated",
  COLLATERAL_DEACTIVATED:     "Collateral Deactivated",
  BORROW_POSITION_OPENED:     "Borrow Position Opened",
  BORROW_POSITION_CLOSED:     "Borrow Position Closed",
  LIQUIDATION_TRIGGERED:      "Liquidation Triggered",
  VALUATION_UPDATED:          "Valuation Updated",
  ORACLE_PRICE_UPDATED:       "Oracle Price Updated",
  OWNERSHIP_TRANSFERRED:      "Ownership Transferred",
};

export const EVENT_COLORS: Record<string, string> = {
  ASSET_SUBMITTED:         "#C8A96E",
  VERIFIER_ASSIGNED:       "#6b8cff",
  PROVENANCE_VALIDATED:    "#6b8cff",
  CUSTODY_CONFIRMED:       "#14F195",
  CUSTODY_AUDIT_COMPLETED: "#14F195",
  RISK_SCORED:             "#FBBF24",
  FRAUD_FLAG_RAISED:       "#f26b6b",
  FRAUD_FLAG_RESOLVED:     "#14F195",
  VERIFICATION_APPROVED:   "#14F195",
  VERIFICATION_REJECTED:   "#f26b6b",
  TOKEN_MINTED:            "#9945FF",
  COLLATERAL_ACTIVATED:    "#14F195",
  BORROW_POSITION_OPENED:  "#6b8cff",
  LIQUIDATION_TRIGGERED:   "#f26b6b",
};