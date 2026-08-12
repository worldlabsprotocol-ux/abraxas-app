import { describe, expect, it } from "vitest";
import { DEMO_REQUIRED_TABLES } from "./demoMigrationManifest";
import {
  DEMO_REST_WRITE_ONLY_REQUIRED_TABLES,
  getRestTableProbePlan,
  isFrozenWriteOnlyRequiredTable,
  serviceRoleExpectsSelect,
} from "./demoRestProbeRegistry";

describe("demoRestProbeRegistry", () => {
  it("marks audit_events as the only frozen write-only required table", () => {
    expect(DEMO_REST_WRITE_ONLY_REQUIRED_TABLES).toEqual(["audit_events"]);
    expect(isFrozenWriteOnlyRequiredTable("audit_events")).toBe(true);
    expect(isFrozenWriteOnlyRequiredTable("partners")).toBe(false);
    expect(serviceRoleExpectsSelect("audit_events")).toBe(false);
    expect(serviceRoleExpectsSelect("partners")).toBe(true);
  });

  it("returns catalog-validated write-only plan for audit_events without SELECT evidence", () => {
    const plan = getRestTableProbePlan("audit_events", false);
    expect(plan.mode).toBe("catalog_validated_write_only");
    expect(plan.expectedPrivileges).toEqual(["INSERT"]);
    expect(plan.evidence).toContain("No REST SELECT probe");
    expect(plan.evidence).not.toContain(".select(");
  });

  it("keeps SELECT-expected required tables on head/count probes", () => {
    for (const table of DEMO_REQUIRED_TABLES) {
      if (table === "audit_events") {
        continue;
      }
      const plan = getRestTableProbePlan(table, false);
      expect(plan.mode).toBe("select_head_count");
      expect(plan.evidence).toContain(`client.from("${table}")`);
    }
  });

  it("fails closed when a required table is missing from the frozen registry", () => {
    const plan = getRestTableProbePlan("future_required_table", false);
    expect(plan.mode).toBe("registry_missing");
    expect(plan.evidence).toContain("frozen DEMO_ALL_SERVICE_ROLE_PRIVILEGE_EXPECTATIONS");
  });

  it("does not bypass REST probing for unmapped optional tables", () => {
    const plan = getRestTableProbePlan("identity_verification_events", true);
    expect(plan.mode).toBe("select_head_count");
  });
});
