// FILE: lib/protocol/proofFirst/trustBoundaries.ts
// Trust lifecycle dependency classification (Build #563) — descriptive, not runtime policy.

export const PROOF_FIRST_BUILD = 563 as const;

/** Lifecycle stages traced in Build #563 audit. */
export const TRUST_LIFECYCLE_STAGES = [
  "wallet_auth_evm",
  "wallet_auth_solana",
  "holder_subject_binding",
  "credential_issuance",
  "document_biometric_capture",
  "evidence_encryption_persistence",
  "policy_evaluation",
  "credential_presentation",
  "decision_receipt_signing",
  "independent_partner_verification",
  "issuer_key_authority",
  "revocation_freshness",
  "replay_protection",
  "cross_chain_portability",
] as const;

export type TrustLifecycleStage = (typeof TRUST_LIFECYCLE_STAGES)[number];

/** Who must be online for the stage to complete. */
export type TrustActor = "holder" | "issuer" | "abraxas_server" | "abraxas_database" | "external_idv" | "relying_party" | "chain_rpc";

/** A = cryptographic / holder-local; B = operator Postgres; C = optional commodity; D = proprietary SaaS transport. */
export type DependencyClass = "A" | "B" | "C" | "D";

export type LifecycleStageAudit = {
  stage: TrustLifecycleStage;
  dependency_class: DependencyClass;
  requires_retained_sensitive_evidence: boolean;
  partner_can_verify_offline: boolean;
  actors: TrustActor[];
  notes: string;
};

/** Code-aligned inventory (main @ Build #563). Convenience vs genuine security called out in docs. */
export const TRUST_LIFECYCLE_AUDIT: readonly LifecycleStageAudit[] = [
  {
    stage: "wallet_auth_evm",
    dependency_class: "B",
    requires_retained_sensitive_evidence: false,
    partner_can_verify_offline: false,
    actors: ["holder", "abraxas_server", "abraxas_database"],
    notes: "Challenge nonce in PostgreSQL; signature verified server-side. RP does not re-verify wallet auth directly.",
  },
  {
    stage: "wallet_auth_solana",
    dependency_class: "B",
    requires_retained_sensitive_evidence: false,
    partner_can_verify_offline: false,
    actors: ["holder", "abraxas_server", "abraxas_database"],
    notes: "Same pattern as EVM; replay tables on Abraxas DB today.",
  },
  {
    stage: "holder_subject_binding",
    dependency_class: "B",
    requires_retained_sensitive_evidence: false,
    partner_can_verify_offline: false,
    actors: ["abraxas_server", "abraxas_database"],
    notes: "Internal subject graph; partners receive pseudonym-bound receipts, not raw wallet linkage in independent path.",
  },
  {
    stage: "credential_issuance",
    dependency_class: "B",
    requires_retained_sensitive_evidence: false,
    partner_can_verify_offline: false,
    actors: ["issuer", "abraxas_server", "abraxas_database"],
    notes: "Manual/sovereign path can issue without Veriff; claims stored as references on signed receipt.",
  },
  {
    stage: "document_biometric_capture",
    dependency_class: "B",
    requires_retained_sensitive_evidence: true,
    partner_can_verify_offline: false,
    actors: ["holder", "abraxas_server", "abraxas_database", "external_idv"],
    notes: "Optional capture flows persist encrypted blobs under abraxas_evidence_custody — not required for subsequent RP verification if VC/receipt issued.",
  },
  {
    stage: "evidence_encryption_persistence",
    dependency_class: "A",
    requires_retained_sensitive_evidence: true,
    partner_can_verify_offline: true,
    actors: ["issuer", "abraxas_server"],
    notes: "AES-GCM at rest; minimum-custody target is time-bounded processing with deletion — not auto-deleted in this build.",
  },
  {
    stage: "policy_evaluation",
    dependency_class: "B",
    requires_retained_sensitive_evidence: false,
    partner_can_verify_offline: false,
    actors: ["abraxas_server", "abraxas_database"],
    notes: "Evaluation produces signed receipt; RP re-validates receipt + policy binding, not full policy engine offline today.",
  },
  {
    stage: "credential_presentation",
    dependency_class: "A",
    requires_retained_sensitive_evidence: false,
    partner_can_verify_offline: true,
    actors: ["holder", "relying_party"],
    notes: "HolderPolicyScopedPresentation carries signed receipt only (Build #563 slice). Eligibility presentation API still uses Abraxas store.",
  },
  {
    stage: "decision_receipt_signing",
    dependency_class: "A",
    requires_retained_sensitive_evidence: false,
    partner_can_verify_offline: true,
    actors: ["issuer"],
    notes: "Ed25519 + verification key registry env; verifyReceiptIndependently.",
  },
  {
    stage: "independent_partner_verification",
    dependency_class: "A",
    requires_retained_sensitive_evidence: false,
    partner_can_verify_offline: true,
    actors: ["relying_party"],
    notes: "No Abraxas HTTP/DB when using signedRecord + local registry + RP replay store.",
  },
  {
    stage: "issuer_key_authority",
    dependency_class: "A",
    requires_retained_sensitive_evidence: false,
    partner_can_verify_offline: true,
    actors: ["relying_party"],
    notes: "ABRAXAS_RECEIPT_VERIFICATION_KEY_REGISTRY or packaged keys; chain registries optional (C).",
  },
  {
    stage: "revocation_freshness",
    dependency_class: "B",
    requires_retained_sensitive_evidence: false,
    partner_can_verify_offline: false,
    actors: ["relying_party", "abraxas_database", "chain_rpc"],
    notes:
      "Build #564: signed portable revocation snapshot (Ed25519 + key registry); unsigned hints fail-closed; optional chain distribution.",
  },
  {
    stage: "replay_protection",
    dependency_class: "A",
    requires_retained_sensitive_evidence: false,
    partner_can_verify_offline: true,
    actors: ["relying_party"],
    notes: "ExternalRelyingPartyHarness consumption store — RP-controlled.",
  },
  {
    stage: "cross_chain_portability",
    dependency_class: "C",
    requires_retained_sensitive_evidence: false,
    partner_can_verify_offline: true,
    actors: ["relying_party", "chain_rpc"],
    notes: "Conformance vectors offline; live observation needs RPC. No raw PII on-chain.",
  },
];
