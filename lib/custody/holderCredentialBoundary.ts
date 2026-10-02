// FILE: lib/custody/holderCredentialBoundary.ts
// Passport evolution toward holder-controlled reusable credentials.

export const PASSPORT_CUSTODY_EVOLUTION_VERSION = "1.0.0" as const;

export const PASSPORT_CURRENT_ASSUMPTIONS = [
  "Passport coordinates verification flows and server-resolved active claims",
  "Raw ID captures are stored in Abraxas-controlled private storage during review windows",
  "Reusable credentials live in credential_claims with claim_value minimized per claim type",
  "L0 self-attestation uses ephemeral ledger rows (age_band only)",
  "Browser session cookie provides hosted-holder continuity, not credential authority",
] as const;

export const PASSPORT_TARGET_STATE = [
  "Passport coordinates holder-controlled reusable credentials, not a centralized profile warehouse",
  "Underlying evidence prefers holder device, holder vault, or authorized issuer custody",
  "Abraxas retains derived facts, credentials, receipts, and audit metadata only as necessary",
  "Presentation proofs remain audience-bound; no global holder identifier across partners",
] as const;

export const PASSPORT_MIGRATION_PHASES = [
  {
    phase: "foundation",
    status: "current_pr",
    description: "Codify storage classes, custody map, guardrails, optional chain adapter boundary",
  },
  {
    phase: "holder_vault_adapter",
    status: "future",
    description: "Optional encrypted holder vault adapter; Abraxas stores wrap key refs only",
  },
  {
    phase: "selective_disclosure_proofs",
    status: "future",
    description: "Integrate established proof systems via adapter; no homegrown crypto",
  },
  {
    phase: "raw_evidence_deprecation",
    status: "future",
    description: "Shorten centralized raw retention where issuer/holder custody available",
  },
] as const;

export const PASSPORT_UNSAFE_PATTERNS = [
  "localStorage as sole credential store without recovery",
  "Exposing sui_address to all partners by default",
  "Persisting DOB after deriveSelfAttestedAgeBand",
  "Including claim_value in public receipt views",
] as const;
