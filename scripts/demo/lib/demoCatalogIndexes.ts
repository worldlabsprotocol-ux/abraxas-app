// FILE: scripts/demo/lib/demoCatalogIndexes.ts
// Index names required by the 17-file Partner Sandbox demo migration manifest.

export interface DemoCatalogIndexExpectation {
  indexName: string;
  tableName: string;
  migrationFile: string;
}

/** Indexes on DEMO_REQUIRED_TABLES created by the approved 17 migrations. */
export const DEMO_REQUIRED_TABLE_INDEXES: readonly DemoCatalogIndexExpectation[] = [
  { indexName: "iv_wallet_idx", tableName: "identity_verifications", migrationFile: "006_abraxas_id.sql" },
  { indexName: "idx_identity_verifications_sui", tableName: "identity_verifications", migrationFile: "007_sui_zklogin.sql" },
  { indexName: "idx_identity_verifications_email", tableName: "identity_verifications", migrationFile: "007_sui_zklogin.sql" },
  { indexName: "ac_holder_idx", tableName: "abraxas_credentials", migrationFile: "006_abraxas_id.sql" },
  { indexName: "idx_abraxas_credentials_sui", tableName: "abraxas_credentials", migrationFile: "007_sui_zklogin.sql" },
  { indexName: "idx_wallet_bindings_subject", tableName: "wallet_bindings", migrationFile: "018_policy_verification.sql" },
  { indexName: "idx_credential_claims_subject", tableName: "credential_claims", migrationFile: "018_policy_verification.sql" },
  { indexName: "idx_credential_claims_type", tableName: "credential_claims", migrationFile: "018_policy_verification.sql" },
  { indexName: "idx_verification_requests_partner", tableName: "verification_requests", migrationFile: "018_policy_verification.sql" },
  { indexName: "idx_verification_decisions_subject", tableName: "verification_decisions", migrationFile: "018_policy_verification.sql" },
  { indexName: "idx_verification_decisions_active_session", tableName: "verification_decisions", migrationFile: "053_partner_flow_idempotency.sql" },
  { indexName: "idx_audit_events_object", tableName: "audit_events", migrationFile: "018_policy_verification.sql" },
  { indexName: "partners_status_idx", tableName: "partners", migrationFile: "025_partners_registry.sql" },
  { indexName: "idx_decision_receipts_partner", tableName: "decision_receipts", migrationFile: "033_decision_receipts.sql" },
  { indexName: "idx_decision_receipts_policy", tableName: "decision_receipts", migrationFile: "033_decision_receipts.sql" },
  { indexName: "idx_decision_receipts_consent", tableName: "decision_receipts", migrationFile: "033_decision_receipts.sql" },
  { indexName: "idx_decision_receipts_pseudonym", tableName: "decision_receipts", migrationFile: "033_decision_receipts.sql" },
  { indexName: "idx_credential_status_events_claim", tableName: "credential_status_events", migrationFile: "034_credential_status_registry.sql" },
  { indexName: "idx_receipt_claim_deps_receipt", tableName: "receipt_claim_dependencies", migrationFile: "034_credential_status_registry.sql" },
  { indexName: "idx_receipt_claim_deps_claim", tableName: "receipt_claim_dependencies", migrationFile: "034_credential_status_registry.sql" },
  { indexName: "partner_metering_events_partner_occurred_idx", tableName: "partner_metering_events", migrationFile: "058_partner_metering_foundation.sql" },
  { indexName: "partner_metering_events_partner_type_occurred_idx", tableName: "partner_metering_events", migrationFile: "058_partner_metering_foundation.sql" },
  { indexName: "partner_webhook_outbox_dispatch_idx", tableName: "partner_webhook_outbox", migrationFile: "062_partner_webhook_outbox.sql" },
  { indexName: "partner_webhook_outbox_expired_lease_idx", tableName: "partner_webhook_outbox", migrationFile: "062_partner_webhook_outbox.sql" },
  { indexName: "partner_webhook_outbox_partner_occurred_idx", tableName: "partner_webhook_outbox", migrationFile: "062_partner_webhook_outbox.sql" },
  { indexName: "partner_webhook_delivery_attempts_partner_idx", tableName: "partner_webhook_delivery_attempts", migrationFile: "062_partner_webhook_outbox.sql" },
] as const;

/** Named policies expected on legacy 006 tables (counts/names only). */
export const DEMO_LEGACY_006_POLICY_NAMES = [
  { tableName: "identity_verifications", policyName: "anon_insert_verifications" },
  { tableName: "abraxas_credentials", policyName: "public_read_credentials" },
  { tableName: "credential_presentations", policyName: "anon_insert_presentations" },
] as const;

export const DEMO_PUBLISH_POLICY_DRAFT_RPC = "publish_partner_policy_draft";
