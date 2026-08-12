import { describe, expect, it } from "vitest";
import type { DemoCatalogValidationConfig } from "./demoCatalogConfig";
import { runCatalogEnvironmentChecks } from "./demoCatalogValidator";
import { getCatalogQuery } from "./demoCatalogQueryRegistry";
import type { DemoCatalogSelectQueryId } from "./demoCatalogQueryRegistry";

function catalogConfig(): DemoCatalogValidationConfig {
  return {
    demoProjectRef: "demo-ref-abc",
    productionProjectRef: "prod-ref-xyz",
    maskedSupabaseUrl: "https://demo…-abc.supabase.co",
    maskedDatabaseTarget: "transport=direct project=demo…-abc",
    databaseUrl: "postgresql://postgres:pw@db.demo-ref-abc.supabase.co:5432/postgres",
    databaseTransport: "direct",
  };
}

type QueryRows = Partial<Record<DemoCatalogSelectQueryId, Record<string, unknown>[]>>;

function mockRunSession(rows: QueryRows) {
  return async (input: Parameters<typeof import("./demoCatalogSession").runCatalogReadOnlySession>[0]) => {
    const result = await input.execute({
      runCatalogQuery: async (queryId) => ({
        rows: rows[queryId] ?? [],
      }),
      executedCatalogQueryIds: () => Object.keys(rows) as DemoCatalogSelectQueryId[],
    });
    return {
      result,
      session: { executedControlQueryIds: [], executedCatalogQueryIds: Object.keys(rows) },
    };
  };
}

describe("demoCatalogValidator", () => {
  it("fails when a required table is missing", async () => {
    const report = await runCatalogEnvironmentChecks({
      config: catalogConfig(),
      env: {},
      runSession: mockRunSession({
        pgcrypto_installed: [{ installed: true }],
        required_tables_exist: [{ table_name: "partners", exists: false }],
        idempotency_column_exists: [{ exists: true }],
        required_tables_rls_enabled: [],
        legacy_006_policy_names: [],
        required_indexes_exist: [],
        publish_policy_draft_function_exists: [{ exists: true }],
        publish_policy_draft_executable: [{ executable: true }],
        service_role_table_privileges: [],
        sandbox_partner_seed: [{ partner_id: "abraxas-partner-sandbox", status: "sandbox" }],
        sandbox_policy_seed: [{
          id: "partner-sandbox-gate-v1",
          partner_id: "abraxas-partner-sandbox",
          status: "active",
          sandbox_only: true,
          has_identity_verified: true,
          has_wallet_binding_confirmed: true,
          has_screening_outcome: true,
        }],
        sandbox_issuer_seed: [{ id: "issuer:abraxas-sandbox", issuer_status: "active" }],
      }) as never,
    });

    expect(report.exitCode).toBe(1);
    expect(report.results.some((r) => r.id === "catalog_table_partners" && r.status === "fail")).toBe(true);
  });

  it("fails when service_role privilege is missing", async () => {
    const report = await runCatalogEnvironmentChecks({
      config: catalogConfig(),
      env: {},
      runSession: mockRunSession({
        pgcrypto_installed: [{ installed: true }],
        required_tables_exist: [{ table_name: "partners", exists: true }],
        idempotency_column_exists: [{ exists: true }],
        required_tables_rls_enabled: [{ table_name: "partners", rls_enabled: true }],
        legacy_006_policy_names: [],
        required_indexes_exist: [{ index_name: "partners_status_idx", exists: true }],
        publish_policy_draft_function_exists: [{ exists: true }],
        publish_policy_draft_executable: [{ executable: true }],
        service_role_table_privileges: [{
          table_name: "partners",
          privilege_type: "SELECT",
          granted: false,
        }],
        sandbox_partner_seed: [{ partner_id: "abraxas-partner-sandbox", status: "sandbox" }],
        sandbox_policy_seed: [{
          id: "partner-sandbox-gate-v1",
          partner_id: "abraxas-partner-sandbox",
          status: "active",
          sandbox_only: true,
          has_identity_verified: true,
          has_wallet_binding_confirmed: true,
          has_screening_outcome: true,
        }],
        sandbox_issuer_seed: [{ id: "issuer:abraxas-sandbox", issuer_status: "active" }],
      }) as never,
    });

    expect(report.exitCode).toBe(1);
    expect(report.results.some((r) => r.id === "catalog_privilege_partners_SELECT" && r.status === "fail")).toBe(true);
  });

  it("sanitizes evidence labels without row payloads", async () => {
    const report = await runCatalogEnvironmentChecks({
      config: catalogConfig(),
      env: {},
      runSession: mockRunSession({
        pgcrypto_installed: [{ installed: true }],
        required_tables_exist: [],
        idempotency_column_exists: [{ exists: true }],
        required_tables_rls_enabled: [],
        legacy_006_policy_names: [],
        required_indexes_exist: [],
        publish_policy_draft_function_exists: [{ exists: true }],
        publish_policy_draft_executable: [{ executable: true }],
        service_role_table_privileges: [],
        sandbox_partner_seed: [{ partner_id: "abraxas-partner-sandbox", status: "sandbox" }],
        sandbox_policy_seed: [{
          id: "partner-sandbox-gate-v1",
          partner_id: "abraxas-partner-sandbox",
          status: "active",
          sandbox_only: true,
          has_identity_verified: true,
          has_wallet_binding_confirmed: true,
          has_screening_outcome: true,
        }],
        sandbox_issuer_seed: [{ id: "issuer:abraxas-sandbox", issuer_status: "active" }],
      }) as never,
    });

    for (const result of report.results) {
      expect(result.detail).not.toMatch(/rules_json|credential_jwt|password|postgresql:\/\//i);
      expect(result.evidence ?? "").toMatch(/^catalog:/);
    }
  });

  it("uses only allowlisted catalog query ids", () => {
    const ids: DemoCatalogSelectQueryId[] = [
      "pgcrypto_installed",
      "required_tables_exist",
      "sandbox_partner_seed",
    ];
    for (const id of ids) {
      expect(getCatalogQuery(id).sql.trim().toUpperCase().startsWith("SELECT")).toBe(true);
    }
  });
});
