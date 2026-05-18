// FILE: lib/types/asset.ts
// CANONICAL Asset model — the center of the entire Abraxas protocol.
// Every service, component, and API hangs off this type.
// Immutable after verification. Event-sourced for all state changes.

// ── Provenance ────────────────────────────────────────────────────────────────
export interface ProvenanceRecord {
  id:            string;
  assetId:       string;
  eventType:     "acquisition" | "sale" | "transfer" | "appraisal" | "auction" | "inheritance";
  date:          string;           // ISO date
  fromEntity?:   string;
  toEntity?:     string;
  priceUsd?:     number;
  currency?:     string;
  documentHash:  string;           // SHA-256 of the supporting document
  documentUrl?:  string;           // IPFS or Arweave URI
  verifiedBy?:   string;           // partner ID from partnerRegistry
  notes?:        string;
  anchoredTx?:   string;           // Solana tx that anchored this record
  createdAt:     number;
}

// ── Custody ───────────────────────────────────────────────────────────────────
export interface CustodyRecord {
  custodianId:      string;        // from partner registry
  custodianName:    string;
  custodianType:    "bonded_vault" | "certified_storage" | "bank_vault" | "institutional_escrow";
  facilityLocation: string;        // city, country
  facilityAddress?: string;
  receivedAt:       number;        // timestamp
  lastAuditAt?:     number;
  nextAuditDue?:    number;
  insuranceValue:   number;        // USD
  insuranceProvider?:string;
  vaultRef:         string;        // internal vault reference
  itemCondition:    "excellent" | "good" | "fair" | "poor";
  conditionNotes?:  string;
  releaseConditions: string[];     // what triggers release of custody
  status:           "active" | "pending_transfer" | "released" | "disputed";
}

// ── Valuation ─────────────────────────────────────────────────────────────────
export interface ValuationRecord {
  id:             string;
  assetId:        string;
  appraisedValue: number;
  currency:       "USD" | "EUR" | "GBP";
  methodology:    "comparable_sales" | "income_approach" | "cost_approach" | "specialist_opinion";
  appraiserId:    string;
  appraiserName:  string;
  appraiserCredentials: string[];
  reportDate:     string;
  validUntil:     string;
  documentHash:   string;
  documentUrl?:   string;
  marketComps?:   { description:string; salePrice:number; date:string }[];
  confidence:     "high" | "medium" | "low";
  notes?:         string;
}

// ── Collateral score ──────────────────────────────────────────────────────────
export interface CollateralScore {
  overallScore:     number;        // 0-100
  liquidityScore:   number;        // 0-100 — how quickly can this be sold
  volatilityScore:  number;        // 0-100 — inverse of price stability
  custodyScore:     number;        // 0-100 — quality of custody arrangement
  provenanceScore:  number;        // 0-100 — depth and verifiability of history
  ltvCap:           number;        // computed max LTV %
  scoredAt:         number;
  scoredBy:         "SYSTEM" | "MANUAL_OVERRIDE";
  riskTier:         "A" | "B" | "C" | "D";
  flags:            string[];      // active risk flags
  nextReviewAt:     number;
}

// ── Liquidity metrics ─────────────────────────────────────────────────────────
export interface LiquidityMetrics {
  averageDaysToSell:  number;      // historical average for this asset class
  activeBidCount?:    number;
  lastKnownBid?:      number;
  floorPrice?:        number;
  thirtyDayVolume?:   number;
  priceChangePercent: number;      // 30d
  liquidityRating:    "high" | "medium" | "low" | "illiquid";
  dataSource:         string;
  updatedAt:          number;
}

// ── Fraud flags ───────────────────────────────────────────────────────────────
export interface FraudFlag {
  id:          string;
  assetId:     string;
  flagType:    "stolen_report" | "ownership_dispute" | "document_forgery" |
               "duplicate_submission" | "wash_sale" | "inflated_appraisal" |
               "provenance_gap" | "custody_mismatch" | "oracle_anomaly";
  severity:    "critical" | "high" | "medium" | "low";
  description: string;
  raisedBy:    string;
  raisedAt:    number;
  resolvedAt?: number;
  resolution?: string;
  status:      "open" | "investigating" | "resolved" | "dismissed";
}

// ── Asset event (append-only, immutable) ──────────────────────────────────────
export type AssetEventType =
  | "ASSET_SUBMITTED"
  | "VERIFIER_ASSIGNED"
  | "DOCUMENT_UPLOADED"
  | "PROVENANCE_VALIDATED"
  | "CUSTODY_CONFIRMED"
  | "CUSTODY_TRANSFERRED"
  | "CUSTODY_AUDIT_COMPLETED"
  | "RISK_SCORED"
  | "FRAUD_FLAG_RAISED"
  | "FRAUD_FLAG_RESOLVED"
  | "VERIFICATION_STAGE_PASSED"
  | "VERIFICATION_STAGE_FAILED"
  | "VERIFICATION_APPROVED"
  | "VERIFICATION_REJECTED"
  | "TOKEN_MINTED"
  | "COLLATERAL_ACTIVATED"
  | "COLLATERAL_DEACTIVATED"
  | "BORROW_POSITION_OPENED"
  | "BORROW_POSITION_CLOSED"
  | "LIQUIDATION_TRIGGERED"
  | "VALUATION_UPDATED"
  | "LIQUIDITY_FLAG_RAISED"
  | "ORACLE_PRICE_UPDATED"
  | "OWNERSHIP_TRANSFERRED";

export interface AssetEvent {
  id:        string;
  assetId:   string;
  eventType: AssetEventType;
  actor:     string;             // wallet address or partner ID or "SYSTEM"
  actorName?: string;
  payload:   Record<string, unknown>;
  txHash?:   string;             // Solana tx if on-chain
  blockTime?: number;
  createdAt: number;             // immutable — never updated
}

// ── Verification certificate ──────────────────────────────────────────────────
export interface VerificationCertificate {
  certificateId:    string;
  assetId:          string;
  tokenAddress?:    string;       // Token-2022 mint address
  metadataUri:      string;       // IPFS/Arweave URI of full metadata
  verifierId:       string;
  verifierName:     string;
  verifierSignature:string;       // Ed25519 signature over certificate hash
  provenanceRoot:   string;       // Merkle root of provenance records
  custodyRef:       string;
  collateralScore:  number;
  fraudRiskScore:   number;
  liquidityRating:  string;
  issuedAt:         number;
  validUntil?:      number;
  revokedAt?:       number;
  revocationReason?:string;
  anchoredTx:       string;       // Solana tx that minted the certificate
}

// ── CANONICAL ASSET MODEL ─────────────────────────────────────────────────────
export interface Asset {
  // Identity
  id:              string;
  title:           string;
  description:     string;
  category:        string;        // asset class name
  subcategory?:    string;

  // Ownership
  ownerWallet:     string;
  previousOwners?: string[];
  ownershipHistory: ProvenanceRecord[];

  // Valuation
  declaredValueUsd: number;
  currentValuation?: ValuationRecord;
  valuationHistory:  ValuationRecord[];

  // Provenance
  provenance:         ProvenanceRecord[];
  provenanceComplete: boolean;    // all gaps filled
  provenanceRoot?:    string;     // Merkle root for verification

  // Custody
  custody?:        CustodyRecord;
  hasCustody:      boolean;

  // Verification
  verificationStatus: VerificationStatus;
  verificationRecord?: import("@/lib/protocol/verificationEngine").VerificationRecord;
  certificate?:       VerificationCertificate;

  // Risk & collateral
  collateralScore?:   CollateralScore;
  liquidityMetrics?:  LiquidityMetrics;
  fraudFlags:         FraudFlag[];
  activeFlags:        number;

  // On-chain
  tokenMint?:      string;
  tokenProgram:    "Token-2022" | "Token" | null;
  metadataUri?:    string;
  mintTx?:         string;
  mintedAt?:       number;

  // Protocol
  mintCostAbra:    number;
  ltv:             number;
  custodyPartner?: string;

  // Events (append-only)
  events:          AssetEvent[];

  // Timestamps
  submittedAt:     number;
  updatedAt:       number;
  verifiedAt?:     number;
  collateralizedAt?:number;

  // Media
  primaryImage?:   string;
  additionalImages?:string[];
  documents?:      { name:string; type:string; hash:string; url?:string }[];
}

// ── Verification status ───────────────────────────────────────────────────────
export type VerificationStatus =
  | "submitted"
  | "under_review"
  | "partner_required"
  | "additional_documents"
  | "provenance_review"
  | "custody_pending"
  | "risk_scoring"
  | "approved"
  | "collateral_eligible"
  | "rejected"
  | "suspended"
  | "expired";

// ── Borrowing position ────────────────────────────────────────────────────────
export interface BorrowingPosition {
  id:                string;
  assetId:           string;
  ownerWallet:       string;
  lenderProtocol:    string;
  principalUsdc:     number;
  currentDebtUsdc:   number;
  interestRateApr:   number;
  collateralValue:   number;
  healthFactor:      number;      // < 1.0 triggers liquidation
  ltvAtOrigination:  number;
  currentLtv:        number;
  liquidationThreshold: number;
  openedAt:          number;
  dueAt?:            number;
  closedAt?:         number;
  status:            "active" | "closed" | "liquidated" | "defaulted";
}