import { describe, expect, it } from "vitest";
import {
  assertCatalogSelectSqlIsAllowlisted,
  assertCatalogSqlIsAllowlisted,
  assertControlSqlIsAllowlisted,
  assertRejectedUserSuppliedSql,
  DEMO_CATALOG_CONTROL_REGISTRY,
  DEMO_CATALOG_SELECT_REGISTRY,
  listCatalogControlAllowlist,
  listCatalogSelectAllowlist,
  type DemoCatalogControlQueryId,
  type DemoCatalogSelectQueryId,
} from "./demoCatalogQueryRegistry";
import { rejectDynamicCatalogSql } from "./demoCatalogSession";
import {
  DEMO_ALL_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS,
  DEMO_SERVICE_ROLE_GRANT_TABLES,
} from "./demoServiceRolePrivilegeExpectations";

describe("demoCatalogQueryRegistry", () => {
  it("audits all 24 runtime tables in service_role_table_privileges", () => {
    const sql = DEMO_CATALOG_SELECT_REGISTRY.service_role_table_privileges.sql;
    for (const table of DEMO_SERVICE_ROLE_GRANT_TABLES) {
      expect(sql).toContain(`('${table}'`);
    }
    const expectedRows = DEMO_ALL_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS.reduce(
      (count, entry) => count + entry.privileges.length,
      0,
    );
    expect(expectedRows).toBe(63);
    expect((sql.match(/\('\w/g) ?? []).length).toBeGreaterThanOrEqual(63);
  });

  it("separates control and catalog allowlists", () => {
    const controlIds = new Set(Object.keys(DEMO_CATALOG_CONTROL_REGISTRY));
    const catalogIds = new Set(Object.keys(DEMO_CATALOG_SELECT_REGISTRY));
    for (const id of catalogIds) {
      expect(controlIds.has(id)).toBe(false);
    }
  });

  it("keeps control entries limited to transaction/session statements", () => {
    for (const entry of listCatalogControlAllowlist()) {
      const normalized = entry.sql.trim().toUpperCase();
      const allowed =
        normalized.startsWith("BEGIN")
        || normalized.startsWith("SET LOCAL")
        || normalized.startsWith("SELECT CURRENT_SETTING")
        || normalized.startsWith("SELECT CURRENT_DATABASE")
        || normalized.startsWith("ROLLBACK");
      expect(allowed, entry.id).toBe(true);
    }
  });

  it("keeps catalog entries SELECT-only", () => {
    for (const entry of listCatalogSelectAllowlist()) {
      expect(entry.sql.trim().toUpperCase().startsWith("SELECT"), entry.id).toBe(true);
    }
  });

  it("does not select raw rules_json in sandbox policy output columns", () => {
    const sql = DEMO_CATALOG_SELECT_REGISTRY.sandbox_policy_seed.sql;
    const selectList = sql.split(/FROM\s+public\.partner_policies/i)[0] ?? "";
    expect(selectList.toLowerCase()).not.toMatch(/^\s*select\s+rules_json\b/i);
    expect(selectList).toContain("sandbox_only");
    expect(selectList).toContain("has_identity_verified");
    expect(selectList).not.toMatch(/\bAS\s+rules_json\b/i);
  });

  it("rejects dynamic SQL outside the registry", () => {
    expect(() => rejectDynamicCatalogSql("SELECT * FROM partners")).toThrow();
  });

  it("rejects DDL, DML, CALL, COPY, DO, and multiple statements", () => {
    const rejected = [
      "INSERT INTO partners VALUES (1)",
      "UPDATE partners SET status = 'x'",
      "DELETE FROM partners",
      "DROP TABLE partners",
      "CALL foo()",
      "COPY partners TO STDOUT",
      "DO $$ BEGIN END $$",
      "SELECT 1; DELETE FROM partners",
      "SELECT 1 -- bypass",
      "SELECT /*x*/ 1",
    ];
    for (const sql of rejected) {
      expect(() => assertRejectedUserSuppliedSql(sql)).toThrow();
    }
  });

  it("accepts every registered control and catalog query id", () => {
    for (const id of Object.keys(DEMO_CATALOG_CONTROL_REGISTRY) as DemoCatalogControlQueryId[]) {
      const sql = DEMO_CATALOG_CONTROL_REGISTRY[id].sql;
      expect(assertControlSqlIsAllowlisted(sql)).toBe(id);
      expect(assertCatalogSqlIsAllowlisted(sql)).toBe(id);
    }
    for (const id of Object.keys(DEMO_CATALOG_SELECT_REGISTRY) as DemoCatalogSelectQueryId[]) {
      const sql = DEMO_CATALOG_SELECT_REGISTRY[id].sql;
      expect(assertCatalogSelectSqlIsAllowlisted(sql)).toBe(id);
      expect(assertCatalogSqlIsAllowlisted(sql)).toBe(id);
    }
  });
});
