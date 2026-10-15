// FILE: lib/databaseRecovery/sovereignSchemaManifest.ts
// Portable PostgreSQL schema for sovereign runtime (no Supabase APIs).

import { DEMO_IDV_ACTIVATION_MANIFEST } from "./idvActivationManifest";

/** Core Abraxas identity + policy tables applied before holder-subject and IDV activation. */
export const SOVEREIGN_SCHEMA_FOUNDATION = [
  "006_abraxas_id.sql",
  "018_policy_verification.sql",
  "020_identity_verification_state_machine.sql",
  /** Sui holder columns + sui_zklogin_identities (recovery inventory). */
  "007_sui_zklogin.sql",
  /** Decision receipts table (recovery inventory + offline verification). */
  "033_decision_receipts.sql",
] as const;

/** Full disposable sovereign schema for Build #556 certification and postgres_direct IDV. */
export const SOVEREIGN_RUNTIME_SCHEMA_MANIFEST = [
  ...SOVEREIGN_SCHEMA_FOUNDATION,
  "136_passport_holder_subjects.sql",
  ...DEMO_IDV_ACTIVATION_MANIFEST,
  "078_age_evidence_records.sql",
  "138_sovereign_idv_evidence_custody.sql",
  "139_sovereign_idv_claims_evidence.sql",
  "140_passport_reusable_credential_state.sql",
  "141_passport_institutional_presentation_consent.sql",
  "142_passport_institutional_authorization_commits.sql",
] as const;

export type SovereignRuntimeMigration = (typeof SOVEREIGN_RUNTIME_SCHEMA_MANIFEST)[number];
