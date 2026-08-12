// FILE: scripts/demo/lib/demoCatalogQueryRegistry.ts
// Allowlisted read-only catalog queries — no dynamic SQL or user-supplied identifiers.

import { buildServiceRolePrivilegeMatrixSqlValues } from "./demoServiceRolePrivilegeExpectations";

/** Hardcoded session bounds — not user-configurable. */
export const DEMO_CATALOG_SESSION_TIMEOUTS = {
  statement_timeout: "30s",
  lock_timeout: "5s",
  idle_in_transaction_session_timeout: "30s",
} as const;

export type DemoCatalogControlQueryId =
  | "begin_read_only"
  | "set_local_statement_timeout"
  | "set_local_lock_timeout"
  | "set_local_idle_in_transaction_session_timeout"
  | "verify_transaction_read_only"
  | "target_database_identity"
  | "rollback";

export type DemoCatalogSelectQueryId =
  | "pgcrypto_installed"
  | "required_tables_exist"
  | "idempotency_column_exists"
  | "required_tables_rls_enabled"
  | "legacy_006_policy_names"
  | "required_indexes_exist"
  | "publish_policy_draft_function_exists"
  | "publish_policy_draft_executable"
  | "service_role_table_privileges"
  | "sandbox_partner_seed"
  | "sandbox_policy_seed"
  | "sandbox_issuer_seed";

export type DemoCatalogQueryId = DemoCatalogControlQueryId | DemoCatalogSelectQueryId;

export type DemoCatalogQueryKind = "control" | "catalog";

export interface DemoCatalogQueryDefinition {
  id: DemoCatalogQueryId;
  kind: DemoCatalogQueryKind;
  sql: string;
  description: string;
}

const REQUIRED_TABLE_VALUES = `
  ('identity_verifications'),
  ('abraxas_credentials'),
  ('credential_claims'),
  ('wallet_bindings'),
  ('partner_policies'),
  ('partners'),
  ('verification_requests'),
  ('verification_decisions'),
  ('consent_receipts'),
  ('audit_events'),
  ('credential_issuers'),
  ('decision_receipts'),
  ('credential_status_events'),
  ('receipt_claim_dependencies'),
  ('partner_metering_events'),
  ('partner_entitlements'),
  ('partner_webhook_configs'),
  ('partner_webhook_outbox'),
  ('partner_webhook_delivery_attempts')
`.trim();

const REQUIRED_INDEX_VALUES = `
  ('iv_wallet_idx'),
  ('idx_identity_verifications_sui'),
  ('idx_identity_verifications_email'),
  ('ac_holder_idx'),
  ('idx_abraxas_credentials_sui'),
  ('idx_wallet_bindings_subject'),
  ('idx_credential_claims_subject'),
  ('idx_credential_claims_type'),
  ('idx_verification_requests_partner'),
  ('idx_verification_decisions_subject'),
  ('idx_verification_decisions_active_session'),
  ('idx_audit_events_object'),
  ('partners_status_idx'),
  ('idx_decision_receipts_partner'),
  ('idx_decision_receipts_policy'),
  ('idx_decision_receipts_consent'),
  ('idx_decision_receipts_pseudonym'),
  ('idx_credential_status_events_claim'),
  ('idx_receipt_claim_deps_receipt'),
  ('idx_receipt_claim_deps_claim'),
  ('partner_metering_events_partner_occurred_idx'),
  ('partner_metering_events_partner_type_occurred_idx'),
  ('partner_webhook_outbox_dispatch_idx'),
  ('partner_webhook_outbox_expired_lease_idx'),
  ('partner_webhook_outbox_partner_occurred_idx'),
  ('partner_webhook_delivery_attempts_partner_idx')
`.trim();

const LEGACY_POLICY_VALUES = `
  ('identity_verifications', 'anon_insert_verifications'),
  ('abraxas_credentials', 'public_read_credentials'),
  ('credential_presentations', 'anon_insert_presentations')
`.trim();

const SERVICE_ROLE_PRIVILEGE_MATRIX = buildServiceRolePrivilegeMatrixSqlValues();

export const DEMO_CATALOG_CONTROL_REGISTRY: Record<
  DemoCatalogControlQueryId,
  DemoCatalogQueryDefinition
> = {
  begin_read_only: {
    id: "begin_read_only",
    kind: "control",
    sql: "BEGIN TRANSACTION READ ONLY",
    description: "Start read-only transaction",
  },
  set_local_statement_timeout: {
    id: "set_local_statement_timeout",
    kind: "control",
    sql: `SET LOCAL statement_timeout = '${DEMO_CATALOG_SESSION_TIMEOUTS.statement_timeout}'`,
    description: "Bound statement duration for catalog session",
  },
  set_local_lock_timeout: {
    id: "set_local_lock_timeout",
    kind: "control",
    sql: `SET LOCAL lock_timeout = '${DEMO_CATALOG_SESSION_TIMEOUTS.lock_timeout}'`,
    description: "Bound lock wait for catalog session",
  },
  set_local_idle_in_transaction_session_timeout: {
    id: "set_local_idle_in_transaction_session_timeout",
    kind: "control",
    sql: `SET LOCAL idle_in_transaction_session_timeout = '${DEMO_CATALOG_SESSION_TIMEOUTS.idle_in_transaction_session_timeout}'`,
    description: "Bound idle-in-transaction duration for catalog session",
  },
  verify_transaction_read_only: {
    id: "verify_transaction_read_only",
    kind: "control",
    sql: `SELECT current_setting('transaction_read_only') = 'on' AS read_only`,
    description: "Verify session is read-only before catalog probes",
  },
  target_database_identity: {
    id: "target_database_identity",
    kind: "control",
    sql: `SELECT current_database() = 'postgres' AS matches_expected`,
    description: "Verify connected database name without exposing identity metadata",
  },
  rollback: {
    id: "rollback",
    kind: "control",
    sql: "ROLLBACK",
    description: "Rollback read-only transaction",
  },
};

export const DEMO_CATALOG_SELECT_REGISTRY: Record<
  DemoCatalogSelectQueryId,
  DemoCatalogQueryDefinition
> = {
  pgcrypto_installed: {
    id: "pgcrypto_installed",
    kind: "catalog",
    sql: `SELECT EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
    ) AS installed`,
    description: "pgcrypto extension presence",
  },
  required_tables_exist: {
    id: "required_tables_exist",
    kind: "catalog",
    sql: `SELECT expected.table_name,
           to_regclass('public.' || expected.table_name) IS NOT NULL AS exists
      FROM (VALUES ${REQUIRED_TABLE_VALUES}) AS expected(table_name)`,
    description: "Required demo tables exist in public schema",
  },
  idempotency_column_exists: {
    id: "idempotency_column_exists",
    kind: "catalog",
    sql: `SELECT EXISTS (
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'verification_decisions'
         AND column_name = 'idempotency_key'
    ) AS exists`,
    description: "verification_decisions.idempotency_key column",
  },
  required_tables_rls_enabled: {
    id: "required_tables_rls_enabled",
    kind: "catalog",
    sql: `SELECT expected.table_name,
           COALESCE(c.relrowsecurity, false) AS rls_enabled
      FROM (VALUES ${REQUIRED_TABLE_VALUES}) AS expected(table_name)
      LEFT JOIN pg_class c ON c.relname = expected.table_name
      LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'`,
    description: "RLS enabled flags for required tables",
  },
  legacy_006_policy_names: {
    id: "legacy_006_policy_names",
    kind: "catalog",
    sql: `SELECT expected.table_name,
           expected.policy_name,
           EXISTS (
             SELECT 1
               FROM pg_policies p
              WHERE p.schemaname = 'public'
                AND p.tablename = expected.table_name
                AND p.policyname = expected.policy_name
           ) AS policy_exists
      FROM (VALUES ${LEGACY_POLICY_VALUES}) AS expected(table_name, policy_name)`,
    description: "Legacy 006 policy names on identity tables",
  },
  required_indexes_exist: {
    id: "required_indexes_exist",
    kind: "catalog",
    sql: `SELECT expected.index_name,
           to_regclass('public.' || expected.index_name) IS NOT NULL AS exists
      FROM (VALUES ${REQUIRED_INDEX_VALUES}) AS expected(index_name)`,
    description: "Required migration indexes exist",
  },
  publish_policy_draft_function_exists: {
    id: "publish_policy_draft_function_exists",
    kind: "catalog",
    sql: `SELECT EXISTS (
      SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
         AND p.proname = 'publish_partner_policy_draft'
    ) AS exists`,
    description: "publish_partner_policy_draft function exists",
  },
  publish_policy_draft_executable: {
    id: "publish_policy_draft_executable",
    kind: "catalog",
    sql: `SELECT has_function_privilege(
      'service_role',
      'public.publish_partner_policy_draft(text, integer)',
      'EXECUTE'
    ) AS executable`,
    description: "service_role can execute publish_partner_policy_draft",
  },
  service_role_table_privileges: {
    id: "service_role_table_privileges",
    kind: "catalog",
    sql: `SELECT expected.table_name,
           expected.privilege_type,
           has_table_privilege(
             'service_role',
             format('public.%I', expected.table_name),
             expected.privilege_type
           ) AS granted
      FROM (VALUES ${SERVICE_ROLE_PRIVILEGE_MATRIX}) AS expected(table_name, privilege_type)`,
    description: "service_role table privileges for demo runtime",
  },
  sandbox_partner_seed: {
    id: "sandbox_partner_seed",
    kind: "catalog",
    sql: `SELECT partner_id, status
      FROM public.partners
     WHERE partner_id = 'abraxas-partner-sandbox'
     LIMIT 1`,
    description: "Canonical sandbox partner row (safe id/status only)",
  },
  sandbox_policy_seed: {
    id: "sandbox_policy_seed",
    kind: "catalog",
    sql: `SELECT id, partner_id, status,
           (rules_json->>'sandbox_only') = 'true' AS sandbox_only,
           EXISTS (
             SELECT 1 FROM jsonb_array_elements(rules_json->'required_claims') elem
              WHERE elem->>'claim_type' = 'identity_verified'
           ) AS has_identity_verified,
           EXISTS (
             SELECT 1 FROM jsonb_array_elements(rules_json->'required_claims') elem
              WHERE elem->>'claim_type' = 'wallet_binding_confirmed'
           ) AS has_wallet_binding_confirmed,
           EXISTS (
             SELECT 1 FROM jsonb_array_elements(rules_json->'required_claims') elem
              WHERE elem->>'claim_type' = 'screening_outcome'
           ) AS has_screening_outcome
      FROM public.partner_policies
     WHERE id = 'partner-sandbox-gate-v1'
       AND status = 'active'
     LIMIT 1`,
    description: "Canonical sandbox policy conformity booleans (no rules_json output)",
  },
  sandbox_issuer_seed: {
    id: "sandbox_issuer_seed",
    kind: "catalog",
    sql: `SELECT id, issuer_status
      FROM public.credential_issuers
     WHERE id = 'issuer:abraxas-sandbox'
     LIMIT 1`,
    description: "Canonical sandbox issuer row (safe id/status only)",
  },
};

export const DEMO_CATALOG_QUERY_REGISTRY: Record<DemoCatalogQueryId, DemoCatalogQueryDefinition> = {
  ...DEMO_CATALOG_CONTROL_REGISTRY,
  ...DEMO_CATALOG_SELECT_REGISTRY,
};

export const DEMO_CATALOG_CONTROL_QUERY_IDS = Object.keys(
  DEMO_CATALOG_CONTROL_REGISTRY,
) as DemoCatalogControlQueryId[];

export const DEMO_CATALOG_SELECT_QUERY_IDS = Object.keys(
  DEMO_CATALOG_SELECT_REGISTRY,
) as DemoCatalogSelectQueryId[];

export const DEMO_CATALOG_QUERY_IDS = Object.keys(
  DEMO_CATALOG_QUERY_REGISTRY,
) as DemoCatalogQueryId[];

const FORBIDDEN_SQL_PATTERNS = [
  /\b(INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|DROP\s+|ALTER\s+|TRUNCATE\s+|CREATE\s+|GRANT\s+|REVOKE\s+|CALL\s+|COPY\s+|\bDO\b)/i,
  /;\s*\S/,
  /--/,
  /\/\*/,
] as const;

export function assertRejectedUserSuppliedSql(sql: string): void {
  const normalized = sql.trim();
  if (!normalized) {
    throw new Error("Empty SQL is not permitted");
  }
  for (const pattern of FORBIDDEN_SQL_PATTERNS) {
    if (pattern.test(normalized)) {
      throw new Error("Rejected SQL pattern for catalog tooling");
    }
  }
}

function lookupAllowlistedQuery(sql: string): DemoCatalogQueryDefinition | undefined {
  const normalized = sql.trim();
  for (const id of DEMO_CATALOG_QUERY_IDS) {
    if (DEMO_CATALOG_QUERY_REGISTRY[id].sql.trim() === normalized) {
      return DEMO_CATALOG_QUERY_REGISTRY[id];
    }
  }
  return undefined;
}

export function getCatalogQuery(id: DemoCatalogQueryId): DemoCatalogQueryDefinition {
  const query = DEMO_CATALOG_QUERY_REGISTRY[id];
  if (!query) {
    throw new Error(`Unknown catalog query id: ${id}`);
  }
  return query;
}

export function getControlQuery(id: DemoCatalogControlQueryId): DemoCatalogQueryDefinition {
  return getCatalogQuery(id);
}

export function getCatalogSelectQuery(id: DemoCatalogSelectQueryId): DemoCatalogQueryDefinition {
  return getCatalogQuery(id);
}

export function assertCatalogSqlIsAllowlisted(sql: string): DemoCatalogQueryId {
  const match = lookupAllowlistedQuery(sql);
  if (!match) {
    throw new Error("Catalog SQL is not in the allowlisted query registry");
  }
  return match.id;
}

export function assertControlSqlIsAllowlisted(sql: string): DemoCatalogControlQueryId {
  const match = lookupAllowlistedQuery(sql);
  if (!match || match.kind !== "control") {
    throw new Error("SQL is not an allowlisted control statement");
  }
  return match.id as DemoCatalogControlQueryId;
}

export function assertCatalogSelectSqlIsAllowlisted(sql: string): DemoCatalogSelectQueryId {
  const match = lookupAllowlistedQuery(sql);
  if (!match || match.kind !== "catalog") {
    throw new Error("SQL is not an allowlisted catalog SELECT statement");
  }
  const normalized = match.sql.trim().toUpperCase();
  if (!normalized.startsWith("SELECT")) {
    throw new Error("Catalog entries must be SELECT-only");
  }
  return match.id as DemoCatalogSelectQueryId;
}

export function listCatalogControlAllowlist(): DemoCatalogQueryDefinition[] {
  return DEMO_CATALOG_CONTROL_QUERY_IDS.map((id) => DEMO_CATALOG_CONTROL_REGISTRY[id]);
}

export function listCatalogSelectAllowlist(): DemoCatalogQueryDefinition[] {
  return DEMO_CATALOG_SELECT_QUERY_IDS.map((id) => DEMO_CATALOG_SELECT_REGISTRY[id]);
}

export function listCatalogQueryAllowlist(): DemoCatalogQueryDefinition[] {
  return DEMO_CATALOG_QUERY_IDS.map((id) => DEMO_CATALOG_QUERY_REGISTRY[id]);
}
