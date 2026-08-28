import { describe, expect, it } from "vitest";
import {
  DEMO_ADJACENT_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS,
  DEMO_ALL_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS,
  DEMO_SERVICE_ROLE_GRANT_TABLES,
  DEMO_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS,
  FORBIDDEN_SERVICE_ROLE_PRIVILEGES,
  buildServiceRolePrivilegeMatrixSqlValues,
  renderServiceRolePrivilegeMatrix,
} from "./demoServiceRolePrivilegeExpectations";
import { DEMO_REQUIRED_TABLES } from "./demoMigrationManifest";

describe("demoServiceRolePrivilegeExpectations", () => {
  it("covers exactly 24 runtime tables in the privilege matrix", () => {
    expect(DEMO_SERVICE_ROLE_GRANT_TABLES).toHaveLength(24);
    expect(new Set(DEMO_SERVICE_ROLE_GRANT_TABLES).size).toBe(24);
    expect(DEMO_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS).toHaveLength(19);
    expect(DEMO_ADJACENT_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS).toHaveLength(5);
    expect(DEMO_ALL_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS).toHaveLength(24);
  });

  it("includes every required table and the five adjacent runtime tables", () => {
    for (const table of DEMO_REQUIRED_TABLES) {
      expect(DEMO_SERVICE_ROLE_GRANT_TABLES).toContain(table);
    }
    expect(DEMO_SERVICE_ROLE_GRANT_TABLES).toEqual(
      expect.arrayContaining([
        "partner_api_keys",
        "partner_api_usage",
        "wallet_binding_challenges",
        "connect_authorization_requests",
        "sui_zklogin_identities",
      ]),
    );
  });

  it("never grants DELETE, TRUNCATE, REFERENCES, or TRIGGER", () => {
    for (const entry of DEMO_ALL_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS) {
      for (const forbidden of FORBIDDEN_SERVICE_ROLE_PRIVILEGES) {
        expect(entry.privileges).not.toContain(forbidden);
      }
    }
  });

  it("expects Phase 1 audit_events service_role privileges (INSERT + SELECT only)", () => {
    const auditEvents = DEMO_ALL_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS.find(
      (entry) => entry.table === "audit_events",
    );
    expect(auditEvents).toBeDefined();
    expect(auditEvents?.privileges).toEqual(["INSERT", "SELECT"]);
    expect(auditEvents?.privileges).not.toContain("UPDATE");
    for (const forbidden of FORBIDDEN_SERVICE_ROLE_PRIVILEGES) {
      expect(auditEvents?.privileges).not.toContain(forbidden);
    }
  });

  it("builds a stable SQL values matrix for catalog validation", () => {
    const values = buildServiceRolePrivilegeMatrixSqlValues();
    expect(values).toContain("('partners', 'SELECT')");
    expect(values).toContain("('partner_api_keys', 'UPDATE')");
    expect(values).toContain("('sui_zklogin_identities', 'INSERT')");

    for (const entry of ["('audit_events', 'INSERT')", "('audit_events', 'SELECT')"] as const) {
      expect(values).toContain(entry);
    }
    for (const forbidden of ["UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"] as const) {
      expect(values).not.toContain(`('audit_events', '${forbidden}')`);
    }

    const derivedPrivilegeCount = DEMO_ALL_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS.reduce(
      (sum, entry) => sum + entry.privileges.length,
      0,
    );
    expect(derivedPrivilegeCount).toBe(63);
    expect(values.split("),").length).toBe(derivedPrivilegeCount);
  });

  it("renders the audited privilege matrix for operator review", () => {
    const matrix = renderServiceRolePrivilegeMatrix();
    expect(matrix).toContain("audit_events: INSERT, SELECT");
    expect(matrix).toContain("partner_api_keys: SELECT, INSERT, UPDATE");
    expect(matrix).not.toMatch(/\bDELETE\b|\bTRUNCATE\b/);
  });
});
