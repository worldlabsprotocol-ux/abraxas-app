// FILE: lib/protocol/verificationEngine.ts
// Deterministic verification state engine.
// All transitions are auditable, timestamped, and immutable.
// NO frontend-only state assumptions. Every advance requires partner action.

import { AssetClassName, ASSET_CLASS_REGISTRY, VerificationPartnerType } from "./assetClasses";

// ── Verification states ────────────────────────────────────────────────────────
export type VerificationStatus =
  | "SUBMITTED"           // Asset submitted, docs hashed on-chain
  | "UNDER_REVIEW"        // Protocol intake review
  | "PARTNER_REQUIRED"    // Awaiting specific partner action
  | "STAGE_COMPLETE"      // Current stage passed, advancing
  | "ADDITIONAL_DOCS"     // More documentation requested
  | "ESCALATED"           // Flagged for senior review
  | "APPROVED"            // All stages passed — collateral eligible
  | "REJECTED"            // Failed verification
  | "SUSPENDED";          // Temporarily suspended pending investigation

export interface VerificationStageRecord {
  stageNumber:   number;
  stageName:     string;
  partnerType:   VerificationPartnerType;
  partnerId?:    string;      // ID of the specific partner who actioned
  partnerName?:  string;
  status:        "pending" | "in_progress" | "passed" | "failed" | "skipped";
  startedAt?:    number;      // timestamp
  completedAt?:  number;
  notes?:        string;
  documentsReceived: string[];
  documentsRequired: string[];
  txSignature?:  string;      // on-chain state transition tx
}

export interface VerificationRecord {
  assetId:        string;
  assetClass:     AssetClassName;
  ownerWallet:    string;
  currentStage:   number;
  totalStages:    number;
  status:         VerificationStatus;
  stages:         VerificationStageRecord[];
  createdAt:      number;
  updatedAt:      number;
  completedAt?:   number;
  rejectedAt?:    number;
  rejectionReason?: string;
  fraudFlags:     string[];
  riskScore:      number;     // 0-100, higher = more risk
  confidenceScore:number;     // 0-100, higher = more confidence
  jurisdiction:   string;
  metadata:       Record<string,string>;
}

// ── Transition guards ─────────────────────────────────────────────────────────
// Prevent invalid state transitions — the core of protocol integrity
export function canAdvanceStage(record: VerificationRecord): boolean {
  if (record.status === "REJECTED" || record.status === "SUSPENDED") return false;
  if (record.currentStage >= record.totalStages) return false;
  const currentStageRecord = record.stages[record.currentStage - 1];
  if (!currentStageRecord) return false;
  return currentStageRecord.status === "passed";
}

export function canApprove(record: VerificationRecord): boolean {
  return (
    record.currentStage === record.totalStages &&
    record.stages.every(s => s.status === "passed" || s.status === "skipped") &&
    record.status !== "REJECTED" &&
    record.fraudFlags.length === 0
  );
}

export function buildInitialRecord(params: {
  assetId:     string;
  assetClass:  AssetClassName;
  ownerWallet: string;
  jurisdiction: string;
}): VerificationRecord {
  const def    = ASSET_CLASS_REGISTRY[params.assetClass];
  const stages = def.verificationStages.map(s => ({
    stageNumber:        s.stage,
    stageName:          s.name,
    partnerType:        s.partnerType,
    status:             "pending" as const,
    documentsReceived:  [],
    documentsRequired:  s.documents,
  }));

  return {
    assetId:         params.assetId,
    assetClass:      params.assetClass,
    ownerWallet:     params.ownerWallet,
    currentStage:    1,
    totalStages:     def.verificationStages.length,
    status:          "SUBMITTED",
    stages,
    createdAt:       Date.now(),
    updatedAt:       Date.now(),
    fraudFlags:      [],
    riskScore:       50,
    confidenceScore: 0,
    jurisdiction:    params.jurisdiction,
    metadata:        {},
  };
}

// ── Risk scoring ──────────────────────────────────────────────────────────────
export function computeRiskScore(record: VerificationRecord): number {
  let score = 50;
  score -= record.fraudFlags.length * 20;
  score += (record.stages.filter(s=>s.status==="passed").length / record.totalStages) * 30;
  if (record.jurisdiction.includes("TRIBAL")) score -= 5; // complexity premium
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function computeConfidenceScore(record: VerificationRecord): number {
  const passed   = record.stages.filter(s=>s.status==="passed").length;
  const total    = record.stages.filter(s=>s.status!=="skipped").length;
  const base     = total > 0 ? (passed / total) * 100 : 0;
  const penalty  = record.fraudFlags.length * 25;
  return Math.max(0, Math.min(100, Math.round(base - penalty)));
}

// ── LTV override based on verification confidence ─────────────────────────────
export function getAdjustedLTV(
  assetClass: AssetClassName,
  confidenceScore: number
): number {
  const baseLTV = ASSET_CLASS_REGISTRY[assetClass].ltv;
  if (confidenceScore >= 90) return baseLTV;
  if (confidenceScore >= 75) return Math.round(baseLTV * 0.90);
  if (confidenceScore >= 60) return Math.round(baseLTV * 0.75);
  return Math.round(baseLTV * 0.50);
}