// FILE: lib/persistence/build579ProductionMigrationPreflight.test.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PASSPORT_SCHEMA_PROBE_KEYS } from "./passportSchemaDependencyMatrix";

const BUILD_579_REQUIRED_OBJECT_KEYS = [
  "passport_holder_subjects",
  "passport_holder_possession_keys",
  "passport_reusable_credentials",
  "passport_institutional_presentation_consents",
  "passport_institutional_authorization_commits",
  "consume_passport_possession_challenge",
] as const;

describe("Build #579 production migration preflight SQL", () => {
  it("includes prerequisite and migration 140-143 probes in one JSON report", () => {
    const sql = readFileSync(
      join(process.cwd(), "scripts/build-579/production-migration-preflight.sql"),
      "utf8",
    );
    expect(sql).toContain("production_migration_preflight_report");
    expect(sql).toContain("prerequisites");
    expect(sql).toContain("migrations_140_143");
    expect(sql).toContain("linked_credential_jti");
    expect(sql).toContain("grants_service_role_140");
    for (const key of BUILD_579_REQUIRED_OBJECT_KEYS) {
      expect(sql, key).toContain(`'${key}'`);
    }
  });

  it("extends Build #578 matrix keys in build-578 probe file", () => {
    const sql578 = readFileSync(
      join(process.cwd(), "scripts/build-578/production-schema-probes.sql"),
      "utf8",
    );
    for (const key of PASSPORT_SCHEMA_PROBE_KEYS.slice(0, 5)) {
      expect(sql578).toContain(`'${key}'`);
    }
  });
});
