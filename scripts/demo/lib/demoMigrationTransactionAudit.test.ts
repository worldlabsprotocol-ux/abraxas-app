import { describe, expect, it } from "vitest";
import { auditRequiredDemoMigrations } from "./demoMigrationTransactionAudit";
import { DEMO_REQUIRED_MIGRATION_ORDER } from "./demoMigrationManifest";

describe("demoMigrationTransactionAudit", () => {
  it("audits all 18 required migrations", () => {
    const audit = auditRequiredDemoMigrations();
    expect(audit).toHaveLength(18);
    expect(audit.map((entry) => entry.file)).toEqual([...DEMO_REQUIRED_MIGRATION_ORDER]);
  });

  it("flags 055 as normalized_transaction_wrapper", () => {
    const audit = auditRequiredDemoMigrations();
    const entry = audit.find((item) => item.file === "055_policy_immutable_versions.sql");
    expect(entry?.mode).toBe("normalized_transaction_wrapper");
    expect(entry?.hazards).toEqual(
      expect.arrayContaining([
        "Top-level BEGIN; stripped for atomic execution",
        "Top-level COMMIT; stripped for atomic execution",
      ]),
    );
  });

  it("marks the remaining required migrations as atomic_wrapper", () => {
    const audit = auditRequiredDemoMigrations();
    const atomic = audit.filter(
      (entry) => entry.file !== "055_policy_immutable_versions.sql",
    );
    expect(atomic.every((entry) => entry.mode === "atomic_wrapper")).toBe(true);
    expect(atomic.every((entry) => entry.hazards.length === 0)).toBe(true);
    expect(atomic.find((entry) => entry.file === "065_service_role_runtime_grants.sql")?.mode).toBe(
      "atomic_wrapper",
    );
  });
});
