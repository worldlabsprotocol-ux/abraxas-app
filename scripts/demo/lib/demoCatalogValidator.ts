// FILE: scripts/demo/lib/demoCatalogValidator.ts
// Authoritative read-only catalog validation for Partner Sandbox demo databases.

import {
  DEMO_REQUIRED_POLICY_CLAIMS,
  DEMO_SANDBOX_ISSUER_ID,
  DEMO_SANDBOX_PARTNER_ID,
  DEMO_SANDBOX_POLICY_ID,
} from "./demoMigrationManifest";
import type { CatalogReadOnlySession } from "./demoCatalogSession";
import { runCatalogReadOnlySession } from "./demoCatalogSession";
import type { DemoCatalogValidationConfig } from "./demoCatalogConfig";
import type { CheckStatus, EnvironmentCheckResult, EnvironmentValidationReport } from "./demoEnvironmentChecks";
import { DEMO_LEGACY_006_POLICY_NAMES } from "./demoCatalogIndexes";

interface TableExistenceRow {
  table_name: string;
  exists: boolean;
}

interface RlsRow {
  table_name: string;
  rls_enabled: boolean;
}

interface PolicyRow {
  table_name: string;
  policy_name: string;
  policy_exists: boolean;
}

interface IndexRow {
  index_name: string;
  exists: boolean;
}

interface PrivilegeRow {
  table_name: string;
  privilege_type: string;
  granted: boolean;
}

interface ExistsRow {
  exists: boolean;
}

interface PgcryptoRow {
  installed: boolean;
}

interface SandboxPartnerRow {
  partner_id: string;
  status: string;
}

interface SandboxPolicyRow {
  id: string;
  partner_id: string;
  status: string;
  sandbox_only: boolean;
  has_identity_verified: boolean;
  has_wallet_binding_confirmed: boolean;
  has_screening_outcome: boolean;
}

interface SandboxIssuerRow {
  id: string;
  issuer_status: string;
}

interface ExecutableRow {
  executable: boolean;
}

function check(
  id: string,
  label: string,
  status: CheckStatus,
  detail: string,
  evidence: string,
  optional = false,
): EnvironmentCheckResult {
  return { id, label, status, detail, evidence, optional };
}

export async function runCatalogEnvironmentChecks(input: {
  config: DemoCatalogValidationConfig;
  env: Record<string, string | undefined>;
  runSession?: typeof runCatalogReadOnlySession;
}): Promise<EnvironmentValidationReport> {
  const runSession = input.runSession ?? runCatalogReadOnlySession;
  const results: EnvironmentCheckResult[] = [];

  const { result: catalogResults } = await runSession({
    databaseUrl: input.config.databaseUrl,
    env: input.env,
    execute: async ({ runCatalogQuery }) => {
      const pgcrypto = await runCatalogQuery<PgcryptoRow>("pgcrypto_installed");
      const tables = await runCatalogQuery<TableExistenceRow>("required_tables_exist");
      const idempotency = await runCatalogQuery<ExistsRow>("idempotency_column_exists");
      const rls = await runCatalogQuery<RlsRow>("required_tables_rls_enabled");
      const policies = await runCatalogQuery<PolicyRow>("legacy_006_policy_names");
      const indexes = await runCatalogQuery<IndexRow>("required_indexes_exist");
      const fnExists = await runCatalogQuery<ExistsRow>("publish_policy_draft_function_exists");
      const fnExec = await runCatalogQuery<ExecutableRow>("publish_policy_draft_executable");
      const privileges = await runCatalogQuery<PrivilegeRow>("service_role_table_privileges");
      const partner = await runCatalogQuery<SandboxPartnerRow>("sandbox_partner_seed");
      const policy = await runCatalogQuery<SandboxPolicyRow>("sandbox_policy_seed");
      const issuer = await runCatalogQuery<SandboxIssuerRow>("sandbox_issuer_seed");

      return {
        pgcrypto,
        tables,
        idempotency,
        rls,
        policies,
        indexes,
        fnExists,
        fnExec,
        privileges,
        partner,
        policy,
        issuer,
      };
    },
  });

  const installed = catalogResults.pgcrypto.rows[0]?.installed === true;
  results.push(
    check(
      "catalog_extension_pgcrypto",
      "Extension pgcrypto",
      installed ? "pass" : "fail",
      installed ? "pgcrypto installed" : "pgcrypto extension missing",
      "catalog:pgcrypto_installed",
    ),
  );

  for (const row of catalogResults.tables.rows) {
    results.push(
      check(
        `catalog_table_${row.table_name}`,
        `Table ${row.table_name}`,
        row.exists ? "pass" : "fail",
        row.exists ? "Present in public schema" : "Required table missing",
        "catalog:required_tables_exist",
      ),
    );
  }

  const idempotencyPresent = catalogResults.idempotency.rows[0]?.exists === true;
  results.push(
    check(
      "catalog_idempotency_column",
      "verification_decisions.idempotency_key",
      idempotencyPresent ? "pass" : "fail",
      idempotencyPresent ? "Column present" : "Column missing — apply 053_partner_flow_idempotency.sql",
      "catalog:idempotency_column_exists",
    ),
  );

  for (const row of catalogResults.rls.rows) {
    results.push(
      check(
        `catalog_rls_${row.table_name}`,
        `RLS ${row.table_name}`,
        row.rls_enabled ? "pass" : "fail",
        row.rls_enabled ? "RLS enabled" : "RLS not enabled",
        "catalog:required_tables_rls_enabled",
      ),
    );
  }

  for (const row of catalogResults.policies.rows) {
    const expected = DEMO_LEGACY_006_POLICY_NAMES.find(
      (item) => item.tableName === row.table_name && item.policyName === row.policy_name,
    );
    results.push(
      check(
        `catalog_policy_${row.table_name}_${row.policy_name}`,
        `Policy ${row.policy_name}`,
        row.policy_exists ? "pass" : "warn",
        row.policy_exists
          ? "Named policy present"
          : `Expected legacy policy missing on ${expected?.tableName ?? row.table_name}`,
        "catalog:legacy_006_policy_names",
        true,
      ),
    );
  }

  for (const row of catalogResults.indexes.rows) {
    results.push(
      check(
        `catalog_index_${row.index_name}`,
        `Index ${row.index_name}`,
        row.exists ? "pass" : "fail",
        row.exists ? "Index present" : "Required index missing",
        "catalog:required_indexes_exist",
      ),
    );
  }

  const fnPresent = catalogResults.fnExists.rows[0]?.exists === true;
  results.push(
    check(
      "catalog_function_publish_partner_policy_draft",
      "Function publish_partner_policy_draft",
      fnPresent ? "pass" : "fail",
      fnPresent ? "Function present" : "RPC missing — apply 056_publish_partner_policy_draft_rpc.sql",
      "catalog:publish_policy_draft_function_exists",
    ),
  );

  const fnExecutable = catalogResults.fnExec.rows[0]?.executable === true;
  results.push(
    check(
      "catalog_function_publish_partner_policy_draft_execute",
      "service_role EXECUTE on publish_partner_policy_draft",
      fnExecutable ? "pass" : "fail",
      fnExecutable ? "EXECUTE granted to service_role" : "service_role cannot execute publish_partner_policy_draft",
      "catalog:publish_policy_draft_executable",
    ),
  );

  for (const row of catalogResults.privileges.rows) {
    results.push(
      check(
        `catalog_privilege_${row.table_name}_${row.privilege_type}`,
        `service_role ${row.privilege_type} on ${row.table_name}`,
        row.granted ? "pass" : "fail",
        row.granted
          ? "Privilege granted"
          : `Missing service_role ${row.privilege_type} on ${row.table_name}`,
        "catalog:service_role_table_privileges",
      ),
    );
  }

  const partnerRow = catalogResults.partner.rows[0];
  if (!partnerRow) {
    results.push(
      check(
        "catalog_sandbox_partner",
        "Sandbox partner row",
        "fail",
        `Missing partner ${DEMO_SANDBOX_PARTNER_ID}`,
        "catalog:sandbox_partner_seed",
      ),
    );
  } else if (partnerRow.status !== "sandbox") {
    results.push(
      check(
        "catalog_sandbox_partner",
        "Sandbox partner row",
        "fail",
        `Expected status=sandbox, got ${partnerRow.status}`,
        "catalog:sandbox_partner_seed",
      ),
    );
  } else {
    results.push(
      check(
        "catalog_sandbox_partner",
        "Sandbox partner row",
        "pass",
        `${DEMO_SANDBOX_PARTNER_ID} status=sandbox`,
        "catalog:sandbox_partner_seed",
      ),
    );
  }

  const policyRow = catalogResults.policy.rows[0];
  if (!policyRow) {
    results.push(
      check(
        "catalog_sandbox_policy",
        "Sandbox policy row",
        "fail",
        `Missing active policy ${DEMO_SANDBOX_POLICY_ID}`,
        "catalog:sandbox_policy_seed",
      ),
    );
  } else if (policyRow.partner_id !== DEMO_SANDBOX_PARTNER_ID) {
    results.push(
      check(
        "catalog_sandbox_policy",
        "Sandbox policy row",
        "fail",
        "Policy partner_id mismatch",
        "catalog:sandbox_policy_seed",
      ),
    );
  } else if (policyRow.sandbox_only !== true) {
    results.push(
      check(
        "catalog_sandbox_policy",
        "Sandbox policy row",
        "fail",
        "rules_json.sandbox_only must be true",
        "catalog:sandbox_policy_seed",
      ),
    );
  } else {
    results.push(
      check(
        "catalog_sandbox_policy",
        "Sandbox policy row",
        "pass",
        `${DEMO_SANDBOX_POLICY_ID} sandbox_only=true`,
        "catalog:sandbox_policy_seed",
      ),
    );

    const missingClaims = DEMO_REQUIRED_POLICY_CLAIMS.filter((claimType) => {
      if (claimType === "identity_verified") return policyRow.has_identity_verified !== true;
      if (claimType === "wallet_binding_confirmed") return policyRow.has_wallet_binding_confirmed !== true;
      if (claimType === "screening_outcome") return policyRow.has_screening_outcome !== true;
      return true;
    });

    results.push(
      check(
        "catalog_sandbox_policy_claims",
        "Sandbox policy required claims",
        missingClaims.length === 0 ? "pass" : "fail",
        missingClaims.length === 0
          ? `Required claims present (${DEMO_REQUIRED_POLICY_CLAIMS.join(", ")})`
          : `Missing required claims: ${missingClaims.join(", ")}`,
        "catalog:sandbox_policy_seed",
      ),
    );
  }

  const issuerRow = catalogResults.issuer.rows[0];
  if (!issuerRow) {
    results.push(
      check(
        "catalog_sandbox_issuer",
        "Sandbox issuer row",
        "fail",
        `Missing issuer ${DEMO_SANDBOX_ISSUER_ID}`,
        "catalog:sandbox_issuer_seed",
      ),
    );
  } else if (issuerRow.issuer_status !== "active") {
    results.push(
      check(
        "catalog_sandbox_issuer",
        "Sandbox issuer row",
        "fail",
        `Expected issuer_status=active, got ${issuerRow.issuer_status}`,
        "catalog:sandbox_issuer_seed",
      ),
    );
  } else {
    results.push(
      check(
        "catalog_sandbox_issuer",
        "Sandbox issuer row",
        "pass",
        `${DEMO_SANDBOX_ISSUER_ID} active`,
        "catalog:sandbox_issuer_seed",
      ),
    );
  }

  const hasMissingRequired = results.some(
    (r) => !r.optional && (r.status === "fail" || r.status === "unverifiable"),
  );

  return {
    results,
    exitCode: hasMissingRequired ? 1 : 0,
  };
}

export function formatCatalogValidationReport(
  config: DemoCatalogValidationConfig,
  report: EnvironmentValidationReport,
): string {
  const lines = [
    "Partner Sandbox Catalog Validation",
    "==================================",
    `Target project: ${config.maskedSupabaseUrl}`,
    `Database target: ${config.maskedDatabaseTarget}`,
    `Transport: ${config.databaseTransport}`,
    "",
  ];

  for (const result of report.results) {
    const tag = result.status.toUpperCase();
    const optional = result.optional ? " (optional)" : "";
    lines.push(`[${tag}] ${result.label}${optional}: ${result.detail}`);
    if (result.evidence) {
      lines.push(`       evidence: ${result.evidence}`);
    }
  }

  lines.push("");
  lines.push(
    report.exitCode === 0
      ? "Result: READY"
      : "Result: MISSING OR INCORRECT DATABASE REQUIREMENTS",
  );

  return lines.join("\n");
}

export type { CatalogReadOnlySession };
