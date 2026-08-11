import { describe, expect, it } from "vitest";
import {
  DEMO_EXCLUDED_MIGRATIONS,
  DEMO_MIGRATION_MANIFEST,
  DEMO_REQUIRED_MIGRATION_ORDER,
  validateDemoMigrationDependencies,
  validateDemoMigrationManifest,
} from "./demoMigrationManifest";

describe("demoMigrationManifest validation", () => {
  it("includes only files that exist in supabase/migrations", () => {
    expect(validateDemoMigrationManifest()).toEqual([]);
  });

  it("keeps required migration order aligned with manifest dependencies", () => {
    expect(validateDemoMigrationDependencies()).toEqual([]);
  });

  it("excludes superseded migrations 028–031 and the repair migration", () => {
    const manifestFiles = DEMO_MIGRATION_MANIFEST.map((entry) => entry.file);
    for (const excluded of DEMO_EXCLUDED_MIGRATIONS) {
      expect(manifestFiles).not.toContain(excluded);
    }
    expect(DEMO_EXCLUDED_MIGRATIONS).toContain("018_policy_verification_repair.sql");
    expect(DEMO_EXCLUDED_MIGRATIONS).toContain("028_meridian_relying_partner.sql");
    expect(DEMO_EXCLUDED_MIGRATIONS).toContain("031_cielo_operator_workflow.sql");
  });

  it("documents the required apply order for a fresh demo database", () => {
    expect(DEMO_REQUIRED_MIGRATION_ORDER[0]).toBe("006_abraxas_id.sql");
    expect(DEMO_REQUIRED_MIGRATION_ORDER).toContain("018_policy_verification.sql");
    expect(DEMO_REQUIRED_MIGRATION_ORDER.at(-1)).toBe("062_partner_webhook_outbox.sql");
  });
});
