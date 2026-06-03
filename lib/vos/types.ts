// FILE: lib/vos/types.ts
// Core types for the Abraxas Verification Operating System

export type AssetClass =
  | "REAL_ESTATE_HOSPITALITY"
  | "REAL_ESTATE_RESIDENTIAL"
  | "REAL_ESTATE_COMMERCIAL"
  | "MINERAL_RIGHTS"
  | "OIL_GAS"
  | "PRECIOUS_METALS"
  | "TRIBAL_LAND"
  | "TIMBER"
  | "WATER_RIGHTS"
  | "CARBON_CREDITS";

export type VerificationStatus =
  | "PENDING"
  | "IN_REVIEW"
  | "VERIFIED"
  | "FAILED"
  | "EXPIRED"
  | "DISPUTED";

export type CollateralStatus =
  | "ELIGIBLE"
  | "INELIGIBLE"
  | "PARTIAL"
  | "UNDER_REVIEW";

export type CustodyStatus =
  | "ACTIVE"
  | "PENDING"
  | "BROKEN"
  | "AUDITING";

export type LiquidityRating = "A" | "B" | "C" | "D" | "F";
export type RiskLevel       = "Low" | "Medium" | "High" | "Critical";

export interface ProvenanceEvent {
  date:    string;
  event:   string;
  actor:   string;
  status:  "COMPLETE" | "PENDING" | "FAILED";
  txHash?: string;
}

export interface CustodyRecord {
  custodian:     string;
  vaultType:     string;
  jurisdiction:  string;
  auditCadence:  string;
  signatories:   { id: string; role: string; hash: string; status: "ACTIVE" | "REVOKED" }[];
  lastAudit:     string;
}

export interface VerificationRecord {
  status:         VerificationStatus;
  standard:       string;        // e.g. "AAS-1"
  certificateId:  string;
  issuedAt:       string;
  validUntil:     string;
  verifier:       string;        // verification partner
  confidence:     number;        // 0–100
  documentHash:   string;
  metadataHash:   string;
  anchoredTx:     string;
}

export interface CollateralIntelligence {
  status:            CollateralStatus;
  score:             number;     // 0–100
  liquidityRating:   LiquidityRating;
  fraudRisk:         RiskLevel;
  fraudScore:        number;     // 0–100, lower = safer
  ltvMax:            number;     // 0–1
  borrowCapacityUsd: number;
  dscr:              number;     // debt service coverage ratio
  insuranceCoverage: number;
  appraisalValue:    number;
  appraisalDate:     string;
  financeable:       boolean;
  reasons:           string[];   // why financeable / not
}

export interface AssetRecord {
  id:               string;     // e.g. "AAS-1", "ABX-RE-HOSP-001"
  name:             string;
  assetClass:       AssetClass;
  jurisdiction:     string;
  ownerEntity:      string;
  registeredAt:     string;
  verification:     VerificationRecord;
  custody:          CustodyRecord;
  collateral:       CollateralIntelligence;
  provenance:       ProvenanceEvent[];
  metadataUri?:     string;
  externalLinks?:   { label: string; url: string }[];
}

// ── Command system ───────────────────────────────────────────────────
export type LogLine = {
  kind: "agent" | "user" | "out" | "error" | "report" | "data";
  text: string;
  ts:   number;
};

export interface CommandContext {
  args:       string[];          // positional args after command name
  raw:        string;            // full raw input
  emit:       (line: Omit<LogLine, "ts">) => void;
  registry:   AssetRegistry;
  history:    string[];
}

export interface CommandHandler {
  (ctx: CommandContext): Promise<void> | void;
}

export interface CommandDefinition {
  name:        string;           // primary name, e.g. "inspect"
  aliases?:    string[];          // e.g. ["i", "look"]
  category:    "core" | "intelligence" | "execution" | "admin";
  description: string;
  syntax:      string;            // e.g. "inspect <asset_id>"
  example?:    string;
  future?:     boolean;           // not yet implemented
  handler:     CommandHandler;
}

export interface AssetRegistry {
  list():           AssetRecord[];
  get(id: string):  AssetRecord | undefined;
  search(q: string): AssetRecord[];
}
