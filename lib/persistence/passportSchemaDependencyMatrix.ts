// FILE: lib/persistence/passportSchemaDependencyMatrix.ts
// Build #578: Passport reusable lifecycle schema dependencies (read-only inventory spec).

export type PassportSchemaDependencyCategory =
  | "canonical_holder"
  | "wallet_binding"
  | "idv_approval"
  | "issuer_issuance"
  | "possession_keys"
  | "reusable_credential"
  | "presentation_challenge"
  | "institutional_consent"
  | "authorization_commit"
  | "signing_claim"
  | "receipt_provenance"
  | "revocation_audit"
  | "evidence_custody";

export type PassportSchemaObjectKind = "table" | "function" | "column";

export interface PassportSchemaDependencyRow {
  /** Stable probe key (machine readable). */
  probeKey: string;
  category: PassportSchemaDependencyCategory;
  kind: PassportSchemaObjectKind;
  objectName: string;
  migration: string;
  /** Earlier migrations or runtime contracts this depends on. */
  dependsOnMigrations: readonly string[];
  /** Primary transactional requirement for direct pg stores. */
  transactionNotes: string;
  /** Whether typical PostgREST product paths read this object today. */
  postgrestDependent: boolean;
}

/** Objects required for reusable Passport issuance and institutional authorization (Build #567–#568). */
export const PASSPORT_REUSABLE_LIFECYCLE_SCHEMA_MATRIX: readonly PassportSchemaDependencyRow[] = [
  {
    probeKey: "passport_holder_subjects",
    category: "canonical_holder",
    kind: "table",
    objectName: "passport_holder_subjects",
    migration: "136_passport_holder_subjects.sql",
    dependsOnMigrations: ["006_abraxas_id.sql", "020_identity_verification_state_machine.sql"],
    transactionNotes: "Holder resolution inserts use ON CONFLICT; subject_id format enforced by check.",
    postgrestDependent: false,
  },
  {
    probeKey: "passport_holder_wallet_accounts",
    category: "wallet_binding",
    kind: "table",
    objectName: "passport_holder_wallet_accounts",
    migration: "136_passport_holder_subjects.sql",
    dependsOnMigrations: ["136_passport_holder_subjects.sql"],
    transactionNotes: "Unique caip10; wallet auth challenges consumed in same migration family.",
    postgrestDependent: false,
  },
  {
    probeKey: "identity_verifications_holder_subject_id",
    category: "idv_approval",
    kind: "column",
    objectName: "identity_verifications.holder_subject_id",
    migration: "136_passport_holder_subjects.sql",
    dependsOnMigrations: ["020_identity_verification_state_machine.sql"],
    transactionNotes: "Issuance gates on approved IDV bound to canonical subject.",
    postgrestDependent: true,
  },
  {
    probeKey: "passport_idv_consent_records",
    category: "evidence_custody",
    kind: "table",
    objectName: "passport_idv_consent_records",
    migration: "138_sovereign_idv_evidence_custody.sql",
    dependsOnMigrations: ["136_passport_holder_subjects.sql"],
    transactionNotes: "IDV consent audit; no biometrics in credential tables.",
    postgrestDependent: false,
  },
  {
    probeKey: "sovereign_credential_issuance_audit",
    category: "issuer_issuance",
    kind: "table",
    objectName: "sovereign_credential_issuance_audit",
    migration: "139_sovereign_idv_claims_evidence.sql",
    dependsOnMigrations: ["138_sovereign_idv_evidence_custody.sql"],
    transactionNotes: "Issuer authorized issuance audit trail.",
    postgrestDependent: false,
  },
  {
    probeKey: "passport_holder_possession_keys",
    category: "possession_keys",
    kind: "table",
    objectName: "passport_holder_possession_keys",
    migration: "140_passport_reusable_credential_state.sql",
    dependsOnMigrations: ["136_passport_holder_subjects.sql"],
    transactionNotes: "FOR UPDATE on register; rotation blocked when active credentials exist.",
    postgrestDependent: false,
  },
  {
    probeKey: "passport_reusable_credentials",
    category: "reusable_credential",
    kind: "table",
    objectName: "passport_reusable_credentials",
    migration: "140_passport_reusable_credential_state.sql",
    dependsOnMigrations: ["136_passport_holder_subjects.sql", "139_sovereign_idv_claims_evidence.sql"],
    transactionNotes: "Unique linked_credential_jti; stores signed_credential_text only.",
    postgrestDependent: false,
  },
  {
    probeKey: "passport_possession_challenges",
    category: "presentation_challenge",
    kind: "table",
    objectName: "passport_possession_challenges",
    migration: "140_passport_reusable_credential_state.sql",
    dependsOnMigrations: ["140_passport_reusable_credential_state.sql"],
    transactionNotes: "Single use via consume_passport_possession_challenge security definer.",
    postgrestDependent: false,
  },
  {
    probeKey: "consume_passport_possession_challenge",
    category: "presentation_challenge",
    kind: "function",
    objectName: "consume_passport_possession_challenge",
    migration: "140_passport_reusable_credential_state.sql",
    dependsOnMigrations: ["140_passport_reusable_credential_state.sql"],
    transactionNotes: "Atomic UPDATE … RETURNING; replay returns null.",
    postgrestDependent: false,
  },
  {
    probeKey: "passport_institutional_presentation_consents",
    category: "institutional_consent",
    kind: "table",
    objectName: "passport_institutional_presentation_consents",
    migration: "141_passport_institutional_presentation_consent.sql",
    dependsOnMigrations: ["140_passport_reusable_credential_state.sql"],
    transactionNotes: "Consent consumed once inside authorization transaction.",
    postgrestDependent: false,
  },
  {
    probeKey: "passport_institutional_authorization_commits",
    category: "authorization_commit",
    kind: "table",
    objectName: "passport_institutional_authorization_commits",
    migration: "142_passport_institutional_authorization_commits.sql",
    dependsOnMigrations: ["141_passport_institutional_presentation_consent.sql"],
    transactionNotes: "Idempotency key PK; finalize uses row locks and signing claim.",
    postgrestDependent: false,
  },
  {
    probeKey: "signing_claim_token",
    category: "signing_claim",
    kind: "column",
    objectName: "passport_institutional_authorization_commits.signing_claim_token",
    migration: "143_passport_authorization_signing_claim.sql",
    dependsOnMigrations: ["142_passport_institutional_authorization_commits.sql"],
    transactionNotes: "Ephemeral worker claim; cleared when receipt_json persisted.",
    postgrestDependent: false,
  },
  {
    probeKey: "decision_receipts",
    category: "receipt_provenance",
    kind: "table",
    objectName: "decision_receipts",
    migration: "033_decision_receipts.sql",
    dependsOnMigrations: [],
    transactionNotes: "Legacy receipt store; institutional reusable path uses commit receipt_json.",
    postgrestDependent: true,
  },
] as const;

export const PASSPORT_SCHEMA_PROBE_KEYS = PASSPORT_REUSABLE_LIFECYCLE_SCHEMA_MATRIX.map(
  (row) => row.probeKey,
);
