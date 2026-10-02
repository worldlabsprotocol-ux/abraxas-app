// FILE: lib/custody/privacyThreatModel.ts
// Privacy and correlation threat model for holder-controlled credentials.

export const PRIVACY_THREATS = [
  {
    id: "global_holder_identifier",
    description: "Stable identifier links all partner interactions",
    mitigation: "subject_pseudonym_id in receipts; pairwise/purpose-bound refs where supported",
  },
  {
    id: "wallet_address_correlation",
    description: "Wallet address exposed to every relying party",
    mitigation: "wallet_binding_ref consent-scoped; never default in webhooks/public receipts",
  },
  {
    id: "cross_partner_tracking",
    description: "Partners collude via shared credential identifiers",
    mitigation: "Audience-bound receipts; partner_id in evaluation context",
  },
  {
    id: "public_credential_metadata",
    description: "On-chain token metadata reveals eligibility category",
    mitigation: "Hash-only commitments; Token-2022 not mandatory",
  },
  {
    id: "stable_artifact_identifiers",
    description: "Content hash reused as global tracking handle",
    mitigation: "Artifact hash bound to policy/partner presentation context",
  },
  {
    id: "blockchain_tx_history",
    description: "On-chain anchors create permanent public linkage",
    mitigation: "Optional adapter; commitments only; no PII on-chain",
  },
  {
    id: "credential_reuse_fingerprinting",
    description: "Repeated presentations enable timing correlation",
    mitigation: "Receipt expiry, re-verification, nonce-bound presentations (future adapter)",
  },
  {
    id: "partner_collusion",
    description: "Multiple partners combine leaked fields",
    mitigation: "Selective disclosure forbidden classes; custody guardrails on all surfaces",
  },
] as const;

export const PRIVACY_DESIGN_PREFERENCES = [
  "Pairwise/purpose-bound identifiers over global wallet exposure",
  "Derived facts over raw evidence in all partner surfaces",
  "Live receipt validity over stale webhook trust",
  "Optional chain anchors over mandatory tokenization",
] as const;

export const LEGAL_CLAIMS_NOT_MADE = [
  "Holder-controlled storage does not eliminate Abraxas legal/processing obligations",
  "This module is not legal advice or a compliance certification",
  "Data controller/processor roles vary by deployment and jurisdiction",
  "Automated erasure of all categories is not claimed in current release",
] as const;
