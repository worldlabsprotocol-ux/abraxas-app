// FILE: scripts/demo/lib/demoProvisionerSchemaPreflight.ts
// Read-only schema preflight for Partner Sandbox holder apply mutations.

import type { ProvisionerPgExecutor } from "./demoProvisionerPgSession";

export interface ProvisionerSchemaColumn {
  table: string;
  column: string;
}

/**
 * Columns referenced by provisioner INSERT/UPDATE paths after required demo migrations.
 * Optional migration 011 (identity_verifications.veriff_session_id) is intentionally excluded.
 */
export const PROVISIONER_REQUIRED_COLUMNS: readonly ProvisionerSchemaColumn[] = [
  { table: "identity_verifications", column: "wallet_address" },
  { table: "identity_verifications", column: "sui_address" },
  { table: "identity_verifications", column: "user_email" },
  { table: "identity_verifications", column: "document_type" },
  { table: "identity_verifications", column: "document_country" },
  { table: "identity_verifications", column: "document_state" },
  { table: "identity_verifications", column: "document_verified" },
  { table: "identity_verifications", column: "liveness_passed" },
  { table: "identity_verifications", column: "liveness_provider" },
  { table: "identity_verifications", column: "status" },
  { table: "identity_verifications", column: "identity_verification_status" },
  { table: "identity_verifications", column: "credential_status" },
  { table: "identity_verifications", column: "credential_jti" },
  { table: "identity_verifications", column: "veriff_decision_id" },
  { table: "identity_verifications", column: "last_verified_at" },
  { table: "identity_verifications", column: "credential_issued_at" },
  { table: "identity_verifications", column: "error_message" },
  { table: "identity_verifications", column: "updated_at" },
  { table: "identity_verification_events", column: "sui_address" },
  { table: "identity_verification_events", column: "from_status" },
  { table: "identity_verification_events", column: "to_status" },
  { table: "identity_verification_events", column: "source" },
  { table: "identity_verification_events", column: "veriff_session_id" },
  { table: "identity_verification_events", column: "created_at" },
  { table: "abraxas_credentials", column: "jti" },
  { table: "abraxas_credentials", column: "holder_wallet" },
  { table: "abraxas_credentials", column: "sui_address" },
  { table: "abraxas_credentials", column: "issuer" },
  { table: "abraxas_credentials", column: "jurisdiction" },
  { table: "abraxas_credentials", column: "document_type" },
  { table: "abraxas_credentials", column: "verification_level" },
  { table: "abraxas_credentials", column: "world_id_verified" },
  { table: "abraxas_credentials", column: "issuance_date" },
  { table: "abraxas_credentials", column: "expiration_date" },
  { table: "abraxas_credentials", column: "credential_jwt" },
  { table: "wallet_bindings", column: "subject_id" },
  { table: "wallet_bindings", column: "chain" },
  { table: "wallet_bindings", column: "wallet_address" },
  { table: "wallet_bindings", column: "binding_method" },
  { table: "wallet_bindings", column: "verified_at" },
  { table: "wallet_bindings", column: "revoked_at" },
  { table: "wallet_bindings", column: "binding_status" },
  { table: "credential_claims", column: "subject_id" },
  { table: "credential_claims", column: "credential_jti" },
  { table: "credential_claims", column: "claim_type" },
  { table: "credential_claims", column: "claim_value" },
  { table: "credential_claims", column: "issuer_id" },
  { table: "credential_claims", column: "assurance_level" },
  { table: "credential_claims", column: "issued_at" },
  { table: "credential_claims", column: "expires_at" },
  { table: "credential_claims", column: "status" },
  { table: "credential_claims", column: "revocation_reference" },
  { table: "credential_claims", column: "evidence_reference" },
  { table: "credential_claims", column: "jurisdiction" },
  { table: "credential_claims", column: "policy_scope" },
  { table: "credential_claims", column: "updated_at" },
  { table: "audit_events", column: "actor_type" },
  { table: "audit_events", column: "actor_id" },
  { table: "audit_events", column: "action" },
  { table: "audit_events", column: "object_type" },
  { table: "audit_events", column: "object_id" },
  { table: "audit_events", column: "metadata" },
  { table: "audit_events", column: "event_hash" },
  { table: "audit_events", column: "created_at" },
] as const;

function buildProvisionerSchemaPreflightSql(): string {
  const values = PROVISIONER_REQUIRED_COLUMNS.map(
    ({ table, column }) => `('${table}', '${column}')`,
  ).join(",\n           ");

  return `SELECT expected.table_name,
           expected.column_name,
           EXISTS (
             SELECT 1
               FROM information_schema.columns c
              WHERE c.table_schema = 'public'
                AND c.table_name = expected.table_name
                AND c.column_name = expected.column_name
           ) AS column_exists
      FROM (VALUES ${values}) AS expected(table_name, column_name)`;
}

export const PROVISIONER_SCHEMA_PREFLIGHT_SQL = buildProvisionerSchemaPreflightSql();

export class DemoProvisionerSchemaError extends Error {
  readonly missingColumns: ProvisionerSchemaColumn[];

  constructor(missingColumns: ProvisionerSchemaColumn[]) {
    const formatted = missingColumns
      .map(({ table, column }) => `${table}.${column}`)
      .join(", ");
    super(
      `Demo database schema is incompatible with the provisioner apply path — missing columns: ${formatted}`,
    );
    this.name = "DemoProvisionerSchemaError";
    this.missingColumns = missingColumns;
  }
}

export async function assertProvisionerSchemaCompatible(
  tx: ProvisionerPgExecutor,
): Promise<void> {
  const result = await tx.query<{
    table_name: string;
    column_name: string;
    column_exists: boolean;
  }>(PROVISIONER_SCHEMA_PREFLIGHT_SQL);

  const missing = result.rows
    .filter((row) => row.column_exists !== true)
    .map((row) => ({ table: row.table_name, column: row.column_name }));

  if (missing.length > 0) {
    throw new DemoProvisionerSchemaError(missing);
  }
}
